import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, createAccount } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await createAccount({
    username: String(body.username || ""),
    email: String(body.email || ""),
    password: String(body.password || ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const res = NextResponse.json({ ok: true, user: result.user });
  return attachSessionCookie(res, result.user, req.url);
}
