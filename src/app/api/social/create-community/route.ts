import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { createCommunityRequestSchema } from "../../../../schema";

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

  const parsedBody = createCommunityRequestSchema.safeParse(jsonBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { name } = parsedBody.data;
  const uid = decoded.uid;
  const adminDb = getAdminDb();
  const communityRef = adminDb.collection("communities").doc();

  const batch = adminDb.batch();
  batch.set(communityRef, {
    name,
    members: [uid],
    createdBy: uid,
    createdAt: getFieldValue().serverTimestamp()
  });
  batch.set(
    adminDb.collection("users").doc(uid),
    { communities: getFieldValue().arrayUnion(communityRef.id) },
    { merge: true }
  );
  await batch.commit();

  return NextResponse.json({ ok: true, communityId: communityRef.id }, { status: 200 });
}
