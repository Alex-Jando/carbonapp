import { NextResponse } from "next/server";

type AuthBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.FIREBASE_API_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!apiKey || !projectId) {
    return NextResponse.json(
      { error: "Server is missing FIREBASE_API_KEY or FIREBASE_PROJECT_ID." },
      { status: 500 }
    );
  }

  let body: AuthBody;
  try {
    body = (await request.json()) as AuthBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Signup failed." },
      { status: res.status }
    );
  }

  const userDoc = {
    fields: {
      email: { stringValue: data.email ?? "" },
      username: { stringValue: "" },
      city: { stringValue: "" },
      friends: { arrayValue: { values: [] } },
      communities: { arrayValue: { values: [] } },
      initialFootprintKg: { nullValue: null },
      carbonOffsetKgTotal: { integerValue: "0" },
      tasks: { arrayValue: { values: [] } }
    }
  };

  const firestoreRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users?documentId=${data.localId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${data.idToken}`,
      },
      body: JSON.stringify(userDoc),
    }
  );

  if (!firestoreRes.ok) {
    const firestoreError = await firestoreRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        error:
          firestoreError?.error?.message ??
          "Failed to create user profile document.",
      },
      { status: firestoreRes.status }
    );
  }

  return NextResponse.json(
    {
      email: data.email,
      localId: data.localId,
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
    },
    { status: 200 }
  );
}
