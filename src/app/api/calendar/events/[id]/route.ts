import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";
import { nowIso } from "@/lib/store";
import { CalendarEventStatus, CalendarEventType } from "@/lib/types";

const TYPES: CalendarEventType[] = [
  "appointment",
  "interview",
  "meeting",
  "other",
];
const STATUSES: CalendarEventStatus[] = [
  "scheduled",
  "confirmed",
  "cancelled",
  "completed",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readCalendarFile();
  const item = file.events.find((e) => e.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readCalendarFile();
  const idx = file.events.findIndex((e) => e.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.events[idx] };
  if (typeof body.title === "string" && body.title.trim()) {
    next.title = body.title.trim();
  }
  if (TYPES.includes(body.type)) next.type = body.type;
  if (typeof body.start === "string") next.start = body.start;
  if (typeof body.end === "string") next.end = body.end;
  if (typeof body.location === "string") next.location = body.location.trim();
  if (typeof body.url === "string") next.url = body.url.trim();
  if (typeof body.notes === "string") next.notes = body.notes;
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.bookerName === "string") next.bookerName = body.bookerName.trim();
  if (typeof body.bookerEmail === "string") {
    next.bookerEmail = body.bookerEmail.trim();
  }

  next.updatedAt = nowIso();
  file.events[idx] = next;
  await writeCalendarFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readCalendarFile();
  const before = file.events.length;
  file.events = file.events.filter((e) => e.id !== params.id);
  if (file.events.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeCalendarFile(file);
  return NextResponse.json({ ok: true });
}
