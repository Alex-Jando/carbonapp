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

  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection("users").doc(decoded.uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const data = userSnap.data() ?? {};
  return NextResponse.json(
    {
      uid: decoded.uid,
      email: data.email ?? decoded.email ?? "",
      username: data.username ?? "",
      city: data.city ?? "",
      friends: Array.isArray(data.friends) ? data.friends : [],
      communities: Array.isArray(data.communities) ? data.communities : []
    },
    { status: 200 }
  );
}
