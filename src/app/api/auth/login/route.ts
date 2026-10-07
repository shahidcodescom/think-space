import { NextRequest, NextResponse } from "next/server";
import { attachSessionCookie, authenticateLogin } from "@/lib/auth";
import { toPublicUser } from "@/lib/auth-store";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await authenticateLogin({
    identifier: String(body.identifier || body.username || body.email || ""),
    password: String(body.password || ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 401 });
  }
  const publicUser = toPublicUser(result.user);
  const res = NextResponse.json({ ok: true, user: publicUser });
  return attachSessionCookie(res, result.user, req.url);
}
