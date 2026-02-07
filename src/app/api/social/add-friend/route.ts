import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { readFileSync } from "fs";
import { addFriendRequestSchema } from "../../../../schema";

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

  const parsedBody = addFriendRequestSchema.safeParse(jsonBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request body.", details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = parsedBody.data;
  const uid = decoded.uid;
  const adminDb = getAdminDb();

  const friendQuery = await adminDb.collection("users").where("email", "==", email).limit(1).get();
  if (friendQuery.empty) {
    return NextResponse.json({ error: "No user found with that email." }, { status: 404 });
  }

  const friendDoc = friendQuery.docs[0];
  const friendUid = friendDoc.id;
  if (friendUid === uid) {
    return NextResponse.json({ error: "You cannot add yourself as a friend." }, { status: 400 });
  }

  const batch = adminDb.batch();
  batch.set(
    adminDb.collection("users").doc(uid),
    { friends: getFieldValue().arrayUnion(friendUid) },
    { merge: true }
  );
  batch.set(
    adminDb.collection("users").doc(friendUid),
    { friends: getFieldValue().arrayUnion(uid) },
    { merge: true }
  );
  await batch.commit();

  return NextResponse.json({ ok: true, friendUid }, { status: 200 });
}
