import { NextResponse } from "next/server";
import { completeTaskRequestSchema } from "../../../schema";
import { getTorontoDateKey } from "../../../lib/dateKey";
import { adminAuth, adminDb, adminFieldValue } from "../../../lib/firebaseAdmin";

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
    decoded = await adminAuth.verifyIdToken(token);
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
  const userRef = adminDb.collection("users").doc(uid);
  const taskRef = userRef.collection("dailyTasks").doc(dailyTaskId);

  let completedTaskId = "";
  let carbonOffsetKg = 0;

  try {
    await adminDb.runTransaction(async (transaction) => {
      const taskSnap = await transaction.get(taskRef);
      if (!taskSnap.exists) {
        throw new Error("DAILY_TASK_NOT_FOUND");
      }

      const taskData = taskSnap.data() ?? {};
      carbonOffsetKg = Number(taskData.carbonOffsetKg) || 0;
      const dateKey = String(taskData.dateKey || getTorontoDateKey());

      const completedRef = userRef.collection("completedTasks").doc();
      completedTaskId = completedRef.id;

      transaction.set(completedRef, {
        title: taskData.title ?? "Untitled task",
        carbonOffsetKg,
        imageUrl: imageUrl ?? null,
        dateKey,
        completedAt: adminFieldValue.serverTimestamp(),
        sourceDailyTaskId: taskRef.id
      });

      transaction.delete(taskRef);
      transaction.set(
        userRef,
        {
          carbonOffsetKgTotal: adminFieldValue.increment(carbonOffsetKg),
          updatedAt: adminFieldValue.serverTimestamp()
        },
        { merge: true }
      );
    });
  } catch (error) {
    if (error instanceof Error && error.message === "DAILY_TASK_NOT_FOUND") {
      return NextResponse.json({ error: "Daily task not found." }, { status: 404 });
    }
    return NextResponse.json({ error: "Failed to complete task." }, { status: 500 });
  }

  const todayKey = getTorontoDateKey();
  const remainingSnap = await userRef
    .collection("dailyTasks")
    .where("dateKey", "==", todayKey)
    .get();

  return NextResponse.json(
    {
      ok: true,
      completedTaskId,
      carbonOffsetKg,
      remainingTasksCount: remainingSnap.size
    },
    { status: 200 }
  );
}
