import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { completeTaskRequestSchema } from "../../../schema";

export const runtime = "nodejs";

function getTorontoDateKey(date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Toronto",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return formatter.format(date);
}

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }
  try {
    const fileContent = readFileSync(trimmed, "utf-8");
    return JSON.parse(fileContent);
  } catch {
    return null;
  }
}

function getAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = resolveServiceAccount();
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  }
  return admin.app();
}

function getAdminAuth() {
  return getAdminApp().auth();
}

function getAdminDb() {
  return getAdminApp().firestore();
}

function getFieldValue() {
  return admin.firestore.FieldValue;
}

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization") ?? "";
  const match = authHeader.match(/^Bearer (.+)$/i);
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Missing Authorization Bearer token." }, { status: 401 });
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  let jsonBody: unknown;
  try {
    jsonBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsedBody = completeTaskRequestSchema.safeParse(jsonBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { dailyTaskId, imageUrl } = parsedBody.data;
  const uid = decoded.uid;
  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const tasksRef = adminDb.collection("tasks");

  let completedTaskId = "";
  let carbonOffsetKg = 0;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) {
        throw new Error("USER_NOT_FOUND");
      }

      const userData = userSnap.data() ?? {};
      const dailyTasks: Array<Record<string, unknown>> = Array.isArray(userData.dailyTasks)
        ? userData.dailyTasks
        : [];

      const taskIndex = dailyTasks.findIndex((task) => task.id === dailyTaskId);
      if (taskIndex === -1) {
        throw new Error("DAILY_TASK_NOT_FOUND");
      }

      const taskData = dailyTasks[taskIndex];
      carbonOffsetKg = Number(taskData.carbonOffsetKg) || 0;
      const dateKey = String(taskData.dateKey || getTorontoDateKey());

      const completedRef = tasksRef.doc(dailyTaskId);
      completedTaskId = completedRef.id;

      transaction.set(completedRef, {
        uid,
        title: taskData.title ?? "Untitled task",
        carbonOffsetKg,
        imageUrl: imageUrl ?? null,
        dateKey,
        completedAt: getFieldValue().serverTimestamp(),
        sourceDailyTaskId: dailyTaskId
      });

      const updatedDailyTasks = dailyTasks.filter((task) => task.id !== dailyTaskId);
      transaction.set(
        userRef,
        {
          dailyTasks: updatedDailyTasks,
          completedTaskIds: getFieldValue().arrayUnion(completedTaskId),
          carbonOffsetKgTotal: getFieldValue().increment(carbonOffsetKg),
          updatedAt: getFieldValue().serverTimestamp()
        },
        { merge: true }
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DAILY_TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Daily task not found." }, { status: 404 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to complete task." }, { status: 500 });
  }

  const remainingSnap = await userRef.get();
  const remainingTasks = Array.isArray(remainingSnap.data()?.dailyTasks)
    ? remainingSnap.data()?.dailyTasks.length
    : 0;

  return NextResponse.json(
    {
      ok: true,
      completedTaskId,
      carbonOffsetKg,
      remainingTasksCount: remainingTasks
    },
    { status: 200 }
  );
}
