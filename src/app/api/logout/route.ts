import { NextResponse } from "next/server";

export async function POST() {
  // Client should clear stored tokens. Server-side revocation requires Admin SDK.
  return NextResponse.json({ ok: true }, { status: 200 });
}

