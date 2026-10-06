import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";
import { nowIso, uid } from "@/lib/store";
import {
  CalendarEvent,
  CalendarEventStatus,
  CalendarEventType,
} from "@/lib/types";

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

function normalize(
  body: Record<string, unknown>,
  base?: CalendarEvent
): CalendarEvent {
  const type = TYPES.includes(body.type as CalendarEventType)
    ? (body.type as CalendarEventType)
    : base?.type || "appointment";
  const status = STATUSES.includes(body.status as CalendarEventStatus)
    ? (body.status as CalendarEventStatus)
    : base?.status || "scheduled";

  return {
    id: base?.id || uid("cal"),
    title: String(body.title ?? base?.title ?? "Untitled").trim() || "Untitled",
    type,
    start: String(body.start ?? base?.start ?? nowIso()),
    end: String(body.end ?? base?.end ?? nowIso()),
    location: String(body.location ?? base?.location ?? "").trim(),
    url: String(body.url ?? base?.url ?? "").trim(),
    notes: String(body.notes ?? base?.notes ?? ""),
    status,
    bookingSource:
      body.bookingSource !== undefined
        ? (body.bookingSource as CalendarEvent["bookingSource"])
        : base?.bookingSource ?? "owner",
    bookerName: String(body.bookerName ?? base?.bookerName ?? "").trim(),
    bookerEmail: String(body.bookerEmail ?? base?.bookerEmail ?? "").trim(),
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const status = searchParams.get("status");

  const file = await readCalendarFile();
  let items = file.events;

  if (type && TYPES.includes(type as CalendarEventType)) {
    items = items.filter((e) => e.type === type);
  }
  if (status && STATUSES.includes(status as CalendarEventStatus)) {
    items = items.filter((e) => e.status === status);
  }
  if (from) {
    const f = new Date(from).getTime();
    items = items.filter((e) => new Date(e.end).getTime() >= f);
  }
  if (to) {
    const t = new Date(to).getTime();
    items = items.filter((e) => new Date(e.start).getTime() <= t);
  }

  items = [...items].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.title || "").trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.start || !body.end) {
    return NextResponse.json(
      { error: "Start and end are required" },
      { status: 400 }
    );
  }
  const item = normalize({ ...body, bookingSource: body.bookingSource ?? "owner" });
  const file = await readCalendarFile();
  file.events.unshift(item);
  await writeCalendarFile(file);
  return NextResponse.json(item, { status: 201 });
}
