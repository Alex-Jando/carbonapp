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
    day: "2-digit",
  });
  return formatter.format(date);
}

function getTorontoDateKeyOffset(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return getTorontoDateKey(date);
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
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token." },
      { status: 401 },
    );
  }

  let decoded;
  try {
    decoded = await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token." },
      { status: 401 },
    );
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
      { status: 400 },
    );
  }

  const { dailyTaskId, imageUrl } = parsedBody.data;
  const uid = decoded.uid;
  const adminDb = getAdminDb();
  const userRef = adminDb.collection("users").doc(uid);
  const completedTasksRef = adminDb.collection("completedTasks");
  const globalDailyStatsRef = adminDb.collection("globalDailyStats");
  const globalTotalsRef = adminDb.collection("globalMeta").doc("totals");

  let completedTaskId = "";
  let carbonOffsetKg = 0;
  let nextCarbonOffsetTotal = 0;
  let nextTasksCompletedCount = 0;
  let nextStreakCurrent = 0;
  let nextStreakBest = 0;
  let nextLastCompletionDateKey: string | null = null;
  let nextDailyStats: {
    dateKey: string;
    tasksCompleted: number;
    carbonOffsetKg: number;
  } | null = null;

  async function runTransactionWithRetry(retries: number) {
    let lastError: unknown = null;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        await adminDb.runTransaction(async (transaction) => {
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists) {
            throw new Error("USER_NOT_FOUND");
          }

          const userData = userSnap.data() ?? {};
          const rawDailyTasks = Array.isArray(userData.dailyTasks)
            ? userData.dailyTasks
            : [];
          const dailyTasks: Array<Record<string, unknown>> = rawDailyTasks.filter(
            (task) => task && typeof task === "object" && "id" in task,
          ) as Array<Record<string, unknown>>;

          const taskIndex = dailyTasks.findIndex((task) => task.id === dailyTaskId);
          if (taskIndex === -1) {
            throw new Error("DAILY_TASK_NOT_FOUND");
          }

          const taskData = dailyTasks[taskIndex];
          carbonOffsetKg = round1(Number(taskData.carbonOffsetKg) || 0);
          const dateKey = String(taskData.dateKey || getTorontoDateKey());
          const yesterdayKey = getTorontoDateKeyOffset(-1);

          const completedRef = completedTasksRef.doc();
          completedTaskId = completedRef.id;

          const currentCarbonOffsetTotal =
            Number(userData.carbonOffsetKgTotal) || 0;
          const currentTasksCompletedCount =
            Number(userData.tasksCompletedCount) || 0;
          const currentStreak = Number(userData.streakCurrent) || 0;
          const currentBest = Number(userData.streakBest) || 0;
          const lastCompletion = userData.lastCompletionDateKey ?? null;

          if (lastCompletion === dateKey) {
            nextStreakCurrent = currentStreak || 1;
          } else if (lastCompletion === yesterdayKey) {
            nextStreakCurrent = currentStreak + 1;
          } else {
            nextStreakCurrent = 1;
          }
          nextStreakBest = Math.max(currentBest, nextStreakCurrent);
          nextLastCompletionDateKey = dateKey;

          nextTasksCompletedCount = currentTasksCompletedCount + 1;
          nextCarbonOffsetTotal = round1(currentCarbonOffsetTotal + carbonOffsetKg);

          const updatedDailyTasks = dailyTasks.filter(
            (task) => task.id !== dailyTaskId,
          );

          const dailyStatsRef = userRef.collection("dailyStats").doc(dateKey);
          const dailyStatsSnap = await transaction.get(dailyStatsRef);
          const dailyStatsData = dailyStatsSnap.exists
            ? (dailyStatsSnap.data() ?? {})
            : {};
          const currentDailyTasksCompleted =
            Number(dailyStatsData.tasksCompleted) || 0;
          const currentDailyCarbonOffset =
            Number(dailyStatsData.carbonOffsetKg) || 0;
          const newDailyTasksCompleted = currentDailyTasksCompleted + 1;
          const newDailyCarbonOffset = round1(currentDailyCarbonOffset + carbonOffsetKg);

          nextDailyStats = {
            dateKey,
            tasksCompleted: newDailyTasksCompleted,
            carbonOffsetKg: newDailyCarbonOffset,
          };

          const communityId =
            Array.isArray(userData.communities) && userData.communities.length > 0
              ? String(userData.communities[0])
              : null;
          let communityName: string | null = null;
          if (communityId) {
            const communitySnap = await transaction.get(
              adminDb.collection("communities").doc(communityId),
            );
            if (communitySnap.exists) {
              const communityData = communitySnap.data() ?? {};
              communityName =
                typeof communityData.name === "string" ? communityData.name : null;
            }
          }

          const completedPayload = {
            uid,
            username: String(userData.username ?? ""),
            userEmail: typeof userData.email === "string" ? userData.email : null,
            communityId,
            communityName,
            title: taskData.title ?? "Untitled task",
            carbonOffsetKg,
            imageUrl: imageUrl ?? null,
            dateKey,
            completedAt: getFieldValue().serverTimestamp(),
            sourceDailyTaskId: dailyTaskId,
          };

          const userCompletedRef = userRef
            .collection("completedTasks")
            .doc(completedTaskId);
          const communityCompletedRef = communityId
            ? adminDb
                .collection("communities")
                .doc(communityId)
                .collection("completedTasks")
                .doc(completedTaskId)
            : null;

          transaction.set(
            dailyStatsRef,
            {
              dateKey,
              tasksCompleted: getFieldValue().increment(1),
              carbonOffsetKg: getFieldValue().increment(carbonOffsetKg),
              updatedAt: getFieldValue().serverTimestamp(),
            },
            { merge: true },
          );

          const globalDailyRef = globalDailyStatsRef.doc(dateKey);
          transaction.set(
            globalDailyRef,
            {
              dateKey,
              tasksCompleted: getFieldValue().increment(1),
              carbonOffsetKg: getFieldValue().increment(carbonOffsetKg),
              updatedAt: getFieldValue().serverTimestamp(),
            },
            { merge: true },
          );

          transaction.set(
            globalTotalsRef,
            {
              tasksCompleted: getFieldValue().increment(1),
              carbonOffsetKg: getFieldValue().increment(carbonOffsetKg),
              updatedAt: getFieldValue().serverTimestamp(),
            },
            { merge: true },
          );

          transaction.set(completedRef, completedPayload);
          transaction.set(userCompletedRef, completedPayload);
          if (communityCompletedRef) {
            transaction.set(communityCompletedRef, completedPayload);
          }

          transaction.set(
            userRef,
            {
              dailyTasks: updatedDailyTasks,
              completedTaskIds: getFieldValue().arrayUnion(completedTaskId),
              carbonOffsetKgTotal: getFieldValue().increment(carbonOffsetKg),
              tasksCompletedCount: getFieldValue().increment(1),
              streakCurrent: nextStreakCurrent,
              streakBest: nextStreakBest,
              lastCompletionDateKey: nextLastCompletionDateKey,
              friends: Array.isArray(userData.friends) ? userData.friends : [],
              communities: Array.isArray(userData.communities)
                ? userData.communities
                : [],
              updatedAt: getFieldValue().serverTimestamp(),
            },
            { merge: true },
          );
        });
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : "";
        const retryable =
          message.includes("write batch") ||
          message.includes("compaction") ||
          message.includes("ABORTED") ||
          message.includes("UNAVAILABLE");
        if (!retryable || attempt === retries) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
    throw lastError;
  }

  try {
    await runTransactionWithRetry(2);
  } catch (error) {
    if (error instanceof Error && error.message === "DAILY_TASK_NOT_FOUND") {
      return NextResponse.json(
        { error: "Daily task not found." },
        { status: 404 },
      );
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    console.log(error);
    return NextResponse.json(
      { error: "Failed to complete task." },
      { status: 500 },
    );
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
      remainingTasksCount: remainingTasks,
      totals: {
        carbonOffsetKgTotal: nextCarbonOffsetTotal,
        tasksCompletedCount: nextTasksCompletedCount,
        streakCurrent: nextStreakCurrent,
        streakBest: nextStreakBest,
        lastCompletionDateKey: nextLastCompletionDateKey,
      },
      todayStats: nextDailyStats,
    },
    { status: 200 },
  );
}
