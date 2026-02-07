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

  try {
    await getAdminAuth().verifyIdToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId") ?? "";
  if (!communityId) {
    return NextResponse.json({ error: "Missing communityId." }, { status: 400 });
  }

  const adminDb = getAdminDb();
  const communitySnap = await adminDb.collection("communities").doc(communityId).get();
  if (!communitySnap.exists) {
    return NextResponse.json({ error: "Community not found." }, { status: 404 });
  }

  const data = communitySnap.data() ?? {};
  return NextResponse.json(
    {
      id: communitySnap.id,
      name: data.name ?? "Untitled",
      members: Array.isArray(data.members) ? data.members : [],
      createdBy: data.createdBy ?? ""
    },
    { status: 200 }
  );
}
