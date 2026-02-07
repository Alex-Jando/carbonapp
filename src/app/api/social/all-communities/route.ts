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

  const adminDb = getAdminDb();
  const snapshot = await adminDb.collection("communities").get();
  const communities = snapshot.docs.map((doc) => {
    const data = doc.data() ?? {};
    const members = Array.isArray(data.members) ? data.members : [];
    return {
      id: doc.id,
      name: data.name ?? "Untitled",
      membersCount: members.length
    };
  });

  return NextResponse.json({ communities }, { status: 200 });
}
