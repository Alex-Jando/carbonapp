import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const unwrap = (value: string) => {
    const trimmed = value.trim();
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) ||
        (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
      return trimmed.slice(1, -1);
    }
    return trimmed;
  };

  const parseJson = (value: string) => {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  };

  const unwrapped = unwrap(raw);

  try {
    if (unwrapped.startsWith("{")) {
      return parseJson(unwrapped);
    }
  } catch {
    // ignore and try base64
  }

  try {
    const decoded = Buffer.from(unwrapped, "base64").toString("utf-8");
    return parseJson(decoded);
  } catch {
    return null;
  }
}

function getAdminApp() {
  if (!admin.apps.length) {
    const serviceAccount = resolveServiceAccount();
    const projectId =
      serviceAccount?.project_id ??
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.FIREBASE_PROJECT_ID;
    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId
      });
    } else if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  }
  return admin.app();
}

function getAdminDb() {
  return getAdminApp().firestore();
}

export async function POST(request: Request) {
  const secret = process.env.BACKFILL_SECRET;
  const provided = request.headers.get("x-admin-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit") ?? 200) || 200, 500);
  const startAfterId = searchParams.get("cursor");

  const adminDb = getAdminDb();
  let query = adminDb
    .collection("completedTasks")
    .orderBy("__name__")
    .limit(limit);
  if (startAfterId) {
    const startDoc = await adminDb
      .collection("completedTasks")
      .doc(startAfterId)
      .get();
    if (startDoc.exists) {
      query = query.startAfter(startDoc);
    }
  }

  const snapshot = await query.get();
  const batch = adminDb.batch();
  let writes = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data() ?? {};
    const uid = data.uid;
    if (!uid) return;
    const userCompletedRef = adminDb
      .collection("users")
      .doc(uid)
      .collection("completedTasks")
      .doc(doc.id);
    batch.set(userCompletedRef, data, { merge: true });
    writes += 1;

    const communityId = data.communityId;
    if (communityId) {
      const communityRef = adminDb
        .collection("communities")
        .doc(communityId)
        .collection("completedTasks")
        .doc(doc.id);
      batch.set(communityRef, data, { merge: true });
      writes += 1;
    }
  });

  if (writes > 0) {
    await batch.commit();
  }

  const lastDoc = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastDoc ? lastDoc.id : null;

  return NextResponse.json(
    {
      ok: true,
      scanned: snapshot.size,
      writes,
      nextCursor,
      done: snapshot.size < limit,
    },
    { status: 200 },
  );
}
