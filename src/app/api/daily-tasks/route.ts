import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { generateDailyTasks } from "../../../ai";

export const runtime = "nodejs";

type DailyTaskDoc = {
  id: string;
  title: string;
  carbonOffsetKg: number;
  difficulty?: "easy" | "medium" | "hard";
  reason?: string;
  dateKey: string;
  createdAt: string;
};

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

export async function GET(request: Request) {
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

  const uid = decoded.uid;
  const dateKey = getTorontoDateKey();

  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() ?? {} : {};

  const needsDefaults =
    userData.tasksCompletedCount === undefined ||
    userData.streakCurrent === undefined ||
    userData.streakBest === undefined ||
    userData.lastCompletionDateKey === undefined ||
    userData.carbonOffsetKgTotal === undefined ||
    userData.friends === undefined ||
    userData.communities === undefined;

  if (needsDefaults) {
    await userRef.set(
      {
        tasksCompletedCount: userData.tasksCompletedCount ?? 0,
        streakCurrent: userData.streakCurrent ?? 0,
        streakBest: userData.streakBest ?? 0,
        lastCompletionDateKey: userData.lastCompletionDateKey ?? null,
        carbonOffsetKgTotal: userData.carbonOffsetKgTotal ?? 0,
        friends: Array.isArray(userData.friends) ? userData.friends : [],
        communities: Array.isArray(userData.communities) ? userData.communities : [],
        updatedAt: getFieldValue().serverTimestamp()
      },
      { merge: true }
    );
  }

  const dailyTasksMeta = userData.dailyTasksMeta ?? null;
  const metaDateKey = dailyTasksMeta?.dateKey ?? null;
  const storedDailyTasks = Array.isArray(userData.dailyTasks) ? userData.dailyTasks : [];

  if (metaDateKey === dateKey) {
    return NextResponse.json({ dateKey, tasks: storedDailyTasks }, { status: 200 });
  }

  const generated = await generateDailyTasks({
    dateKey,
    userProfile: {
      username: userData.username,
      email: userData.email,
      city: userData.city,
      initialFootprintKg: userData.initialFootprintKg ?? null,
      carbonOffsetKgTotal: userData.carbonOffsetKgTotal ?? 0
    }
  });

  if (!generated) {
    return NextResponse.json({ error: "Failed to generate daily tasks." }, { status: 500 });
  }

  const tasks: DailyTaskDoc[] = [];

  for (const task of generated.tasks) {
    const taskId = adminDb.collection("_").doc().id;
    tasks.push({
      id: taskId,
      title: task.title,
      carbonOffsetKg: task.carbonOffsetKg,
      difficulty: task.difficulty,
      reason: task.reason,
      dateKey,
      createdAt: new Date().toISOString()
    });
  }

  const userUpdate = {
    username: userData.username ?? "",
    email: userData.email ?? decoded.email ?? "",
    city: userData.city ?? "",
    initialFootprintKg: userData.initialFootprintKg ?? null,
    carbonOffsetKgTotal: userData.carbonOffsetKgTotal ?? 0,
    dailyTasksMeta: {
      dateKey,
      generatedAt: getFieldValue().serverTimestamp()
    },
    dailyTasks: tasks,
    updatedAt: getFieldValue().serverTimestamp()
  };

  await userRef.set(userUpdate, { merge: true });

  return NextResponse.json({ dateKey, tasks }, { status: 200 });
}
