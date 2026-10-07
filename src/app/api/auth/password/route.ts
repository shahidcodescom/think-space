import { NextRequest, NextResponse } from "next/server";
import { changePassword, getSessionFromCookies } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const result = await changePassword({
    currentPassword: String(body.currentPassword || ""),
    newPassword: String(body.newPassword || ""),
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
