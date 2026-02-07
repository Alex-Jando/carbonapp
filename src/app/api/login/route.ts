import { NextResponse } from "next/server";

type AuthBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.FIREBASE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server is missing FIREBASE_API_KEY." },
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

  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await res.json();
  if (!res.ok) {
    return NextResponse.json(
      { error: data?.error?.message ?? "Login failed." },
      { status: res.status }
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
