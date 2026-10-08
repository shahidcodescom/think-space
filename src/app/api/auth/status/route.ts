import { NextResponse } from "next/server";
import { accountExists, getSessionFromCookies } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const setupRequired = !(await accountExists());
  const user = setupRequired ? null : await getSessionFromCookies();
  return NextResponse.json({
    setupRequired,
    authenticated: Boolean(user),
    user,
  });
}
