import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    return NextResponse.json(
      { error: "Server is missing NEXT_PUBLIC_FIREBASE_PROJECT_ID." },
      { status: 500 },
    );
  }

  const { searchParams } = new URL(request.url);
  const localId = searchParams.get("localId")?.trim() ?? "";
  if (!localId) {
    return NextResponse.json({ error: "Missing localId." }, { status: 400 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const tokenMatch = authHeader.match(/^Bearer (.+)$/i);
  if (!tokenMatch) {
    return NextResponse.json(
      { error: "Missing Authorization Bearer token." },
      { status: 401 },
    );
  }

  const idToken = tokenMatch[1];
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${localId}`;
  const firestoreRes = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  if (!firestoreRes.ok) {
    const firestoreError = await firestoreRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: firestoreError?.error?.message ?? "Failed to load profile." },
      { status: firestoreRes.status },
    );
  }

  const data = await firestoreRes.json();
  const fields = data?.fields ?? {};
  const initialFootprintKgField = fields.initialFootprintKg ?? null;

  let initialFootprintKg: number | null = null;
  if (initialFootprintKgField?.integerValue) {
    const parsed = Number(initialFootprintKgField.integerValue);
    initialFootprintKg = Number.isFinite(parsed) ? parsed : null;
  }

  return NextResponse.json({
    localId,
    initialFootprintKg,
  });
}

