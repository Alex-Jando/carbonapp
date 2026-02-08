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
  const uid = searchParams.get("uid") ?? "";
  if (!uid) {
    return NextResponse.json({ error: "Missing uid." }, { status: 400 });
  }

  const adminDb = getAdminDb();
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const data = userSnap.data() ?? {};
  return NextResponse.json(
    {
      uid: userSnap.id,
      email: data.email ?? "",
      username: data.username ?? "",
      city: data.city ?? "",
      initialFootprintKg: data.initialFootprintKg ?? null,
      carbonOffsetKgTotal: data.carbonOffsetKgTotal ?? 0
    },
    { status: 200 }
  );
}
