import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";

export const runtime = "nodejs";

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

function getAdminDb() {
  return getAdminApp().firestore();
}

function parseCursor(cursor: string | null) {
  if (!cursor) return null;
  const [millisStr, docId] = cursor.split("|");
  const millis = Number(millisStr);
  if (!docId || !Number.isFinite(millis)) return null;
  return { ts: admin.firestore.Timestamp.fromMillis(millis), docId };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 15) || 15, 30);
  const cursor = parseCursor(searchParams.get("cursor"));

  const adminDb = getAdminDb();
  let query = adminDb
    .collection("completedTasks")
    .orderBy("completedAt", "desc")
    .orderBy("__name__", "desc")
    .limit(limit);

  if (cursor) {
    query = query.startAfter(cursor.ts, cursor.docId);
  }

  const snapshot = await query.get();
  const items = snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const completedAt = data.completedAt?.toDate
      ? data.completedAt.toDate().toISOString()
      : null;
    return {
      id: doc.id,
      title: data.title ?? "Untitled task",
      carbonOffsetKg: Number(data.carbonOffsetKg) || 0,
      completedAt,
      username: data.username ?? "",
      userEmail: data.userEmail ?? null,
      imageUrl: data.imageUrl ?? null,
      uid: data.uid ?? "",
      communityId: data.communityId ?? null,
      communityName: data.communityName ?? null,
    };
  });

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor =
    lastDoc && lastDoc.data().completedAt
      ? `${lastDoc.data().completedAt.toMillis?.() ?? Date.now()}|${lastDoc.id}`
      : null;

  const totalsSnap = await adminDb.collection("globalMeta").doc("totals").get();
  const totalsData = totalsSnap.data() ?? {};

  const dailyStatsSnap = await adminDb
    .collection("globalDailyStats")
    .orderBy("dateKey", "desc")
    .limit(30)
    .get();

  const dailyStats = dailyStatsSnap.docs
    .map((doc) => doc.data())
    .sort((a, b) => String(a.dateKey).localeCompare(String(b.dateKey)));

  return NextResponse.json(
    {
      items,
      nextCursor,
      stats: {
        totals: {
          tasksCompleted: Number(totalsData.tasksCompleted) || 0,
          carbonOffsetKg: Number(totalsData.carbonOffsetKg) || 0,
        },
        dailyStats,
      },
    },
    { status: 200 },
  );
}
