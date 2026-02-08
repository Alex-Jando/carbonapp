import { NextResponse } from "next/server";
import admin from "firebase-admin";
import { createCommunityRequestSchema } from "../../../../schema";

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
