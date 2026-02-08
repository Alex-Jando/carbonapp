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

function getAdminAuth() {
  return getAdminApp().auth();
}

function getAdminDb() {
  return getAdminApp().firestore();
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

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const communityId = searchParams.get("communityId");
  const limit = Math.min(Number(searchParams.get("limit") ?? 15) || 15, 30);

  const adminDb = getAdminDb();
  let query: FirebaseFirestore.Query;

  if (uid) {
    query = adminDb
      .collection("users")
      .doc(uid)
      .collection("completedTasks")
      .orderBy("completedAt", "desc")
      .limit(limit);
  } else if (communityId) {
    query = adminDb
      .collection("communities")
      .doc(communityId)
      .collection("completedTasks")
      .orderBy("completedAt", "desc")
      .limit(limit);
  } else {
    query = adminDb
      .collection("completedTasks")
      .orderBy("completedAt", "desc")
      .limit(limit);
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

  return NextResponse.json({ items }, { status: 200 });
}
