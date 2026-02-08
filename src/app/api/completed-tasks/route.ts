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
  const completedTasksRef = adminDb.collection("completedTasks");

  const mapDoc = (doc: FirebaseFirestore.DocumentSnapshot) => {
    const data = doc.data() ?? {};
    const completedAt = data.completedAt?.toDate
      ? data.completedAt.toDate().toISOString()
      : null;
    return {
      id: doc.id,
      title: data.title ?? "Untitled task",
      carbonOffsetKg: Math.round((Number(data.carbonOffsetKg) || 0) * 10) / 10,
      completedAt,
      username: data.username ?? "",
      userEmail: data.userEmail ?? null,
      imageUrl: data.imageUrl ?? null,
      uid: data.uid ?? "",
    };
  };

  async function fetchTasksByIds(ids: string[]) {
    if (!ids.length) return [];
    const refs = ids.map((id) => completedTasksRef.doc(id));
    const snaps = await adminDb.getAll(...refs);
    const items = snaps
      .filter((snap) => snap.exists)
      .map(mapDoc)
      .sort((a, b) => {
        const aTime = a.completedAt ? Date.parse(a.completedAt) : 0;
        const bTime = b.completedAt ? Date.parse(b.completedAt) : 0;
        return bTime - aTime;
      });
    return items.slice(0, limit);
  }

  let items: Array<Record<string, unknown>> = [];

  if (uid) {
    const userSnap = await adminDb.collection("users").doc(uid).get();
    const completedTaskIds = Array.isArray(userSnap.data()?.completedTaskIds)
      ? (userSnap.data()?.completedTaskIds as string[])
      : [];
    items = await fetchTasksByIds(completedTaskIds);
  } else if (communityId) {
    const communitySnap = await adminDb.collection("communities").doc(communityId).get();
    const memberIds = Array.isArray(communitySnap.data()?.members)
      ? (communitySnap.data()?.members as string[])
      : [];
    if (memberIds.length) {
      const memberRefs = memberIds.map((id) => adminDb.collection("users").doc(id));
      const memberSnaps = await adminDb.getAll(...memberRefs);
      const allTaskIds = new Set<string>();
      for (const memberSnap of memberSnaps) {
        const memberData = memberSnap.data() ?? {};
        const ids = Array.isArray(memberData.completedTaskIds)
          ? (memberData.completedTaskIds as string[])
          : [];
        for (const id of ids) {
          allTaskIds.add(String(id));
        }
      }
      items = await fetchTasksByIds(Array.from(allTaskIds));
    }
  } else {
    const snapshot = await completedTasksRef
      .orderBy("completedAt", "desc")
      .limit(limit)
      .get();
    items = snapshot.docs.map(mapDoc);
  }

  return NextResponse.json({ items }, { status: 200 });
}
