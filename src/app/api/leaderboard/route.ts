import { NextResponse } from "next/server";
import admin from "firebase-admin";

export const runtime = "nodejs";

function resolveServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  const unwrap = (value: string) => {
    const trimmed = value.trim();
    if (
      (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
      (trimmed.startsWith("\"") && trimmed.endsWith("\""))
    ) {
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
        projectId,
      });
    } else if (projectId) {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId,
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

function normalizeDisplayName(value: unknown, fallback = "Anonymous") {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function emailFallbackDisplay(email: unknown) {
  if (typeof email !== "string") return "Anonymous";
  const trimmed = email.trim();
  if (!trimmed) return "Anonymous";
  return trimmed.includes("@") ? trimmed.split("@")[0] : trimmed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = Number(searchParams.get("limit") ?? 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) ? limitParam : 10, 1),
    100,
  );

  const adminDb = getAdminDb();
  const snapshot = await adminDb
    .collection("users")
    .orderBy("carbonOffsetKgTotal", "desc")
    .limit(limit)
    .get();

  const items = snapshot.docs.map((doc, index) => {
    const data = doc.data() ?? {};
    const carbonOffsetKgTotal = Math.round((Number(data.carbonOffsetKgTotal) || 0) * 10) / 10;
    const tasksCompletedCount = Number(data.tasksCompletedCount) || 0;
    const username =
      normalizeDisplayName(data.username, "") ||
      emailFallbackDisplay(data.email);

    return {
      rank: index + 1,
      uid: doc.id,
      username,
      city: normalizeDisplayName(data.city, ""),
      carbonOffsetKgTotal,
      tasksCompletedCount,
    };
  });

  return NextResponse.json(
    {
      items,
      generatedAt: new Date().toISOString(),
    },
    { status: 200 },
  );
}
