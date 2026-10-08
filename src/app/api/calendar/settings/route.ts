import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await readCalendarFile();
  return NextResponse.json(file.settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const file = await readCalendarFile();
  const s = file.settings;

  if (typeof body.permanentSlug === "string") {
    const slug = body.permanentSlug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "")
      .slice(0, 40);
    if (!slug) {
      return NextResponse.json({ error: "Invalid slug" }, { status: 400 });
    }
    s.permanentSlug = slug;
  }
  if (typeof body.permanentEnabled === "boolean") {
    s.permanentEnabled = body.permanentEnabled;
  }
  if (typeof body.ownerDisplayName === "string") {
    s.ownerDisplayName = body.ownerDisplayName.trim() || s.ownerDisplayName;
  }
  if (typeof body.timezone === "string" && body.timezone.trim()) {
    s.timezone = body.timezone.trim();
  }
  if (body.slotMinutes !== undefined) {
    const n = Number(body.slotMinutes);
    if (Number.isFinite(n) && n >= 15 && n <= 180) s.slotMinutes = n;
  }

  file.settings = s;
  await writeCalendarFile(file);
  return NextResponse.json(s);
}
