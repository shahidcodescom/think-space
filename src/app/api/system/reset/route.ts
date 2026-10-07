import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie, getSessionFromCookies } from "@/lib/auth";
import {
  SYSTEM_RESET_PHRASE,
  performSystemReset,
} from "@/lib/system-reset";

export async function POST(req: NextRequest) {
  const user = await getSessionFromCookies();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phrase = String(body.confirmPhrase || body.confirmText || "").trim();
  if (phrase !== SYSTEM_RESET_PHRASE) {
    return NextResponse.json(
      {
        error: `Type ${SYSTEM_RESET_PHRASE} to confirm system reset.`,
      },
      { status: 400 }
    );
  }

  const report = await performSystemReset();
  const res = NextResponse.json({
    ok: true,
    redirectTo: "/setup",
    report,
  });
  return clearSessionCookie(res, req.url);
}
