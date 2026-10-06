import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";
import { nowIso, uid } from "@/lib/store";
import { randomBytes } from "crypto";

export async function GET() {
  const file = await readCalendarFile();
  return NextResponse.json(file.tempLinks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const file = await readCalendarFile();
  const days = Number(body.expiresInDays) || 7;
  const expires = new Date();
  expires.setDate(expires.getDate() + days);

  const link = {
    id: uid("tl"),
    token: String(body.token || randomBytes(8).toString("hex")),
    label: String(body.label || "Temporary booking").trim(),
    expiresAt:
      typeof body.expiresAt === "string"
        ? body.expiresAt
        : expires.toISOString(),
    revoked: false,
    dates: Array.isArray(body.dates)
      ? body.dates.map((d: unknown) => String(d).slice(0, 10))
      : [],
    createdAt: nowIso(),
  };

  file.tempLinks.unshift(link);
  await writeCalendarFile(file);
  return NextResponse.json(link, { status: 201 });
}
