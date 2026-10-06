import { NextRequest, NextResponse } from "next/server";
import {
  computeAvailableSlots,
  isTempLinkActive,
  readCalendarFile,
  writeCalendarFile,
} from "@/lib/calendar-store";
import { nowIso, uid } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const file = await readCalendarFile();
  const link = file.tempLinks.find((l) => l.token === params.token);
  if (!link || !isTempLinkActive(link)) {
    return NextResponse.json(
      { error: "This booking link is expired or revoked" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  let from =
    searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const toDate = new Date(from);
  toDate.setDate(toDate.getDate() + 21);
  let to = searchParams.get("to") || toDate.toISOString().slice(0, 10);

  if (link.dates.length) {
    const sorted = [...link.dates].sort();
    from = sorted[0];
    to = sorted[sorted.length - 1];
  }

  const slots = computeAvailableSlots(file, from, to, {
    allowedDates: link.dates.length ? link.dates : null,
  });

  return NextResponse.json({
    ownerDisplayName: file.settings.ownerDisplayName,
    label: link.label,
    expiresAt: link.expiresAt,
    timezone: file.settings.timezone,
    slotMinutes: file.settings.slotMinutes,
    dates: link.dates,
    slots,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const file = await readCalendarFile();
  const link = file.tempLinks.find((l) => l.token === params.token);
  if (!link || !isTempLinkActive(link)) {
    return NextResponse.json(
      { error: "This booking link is expired or revoked" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const start = String(body.start || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const title =
    String(body.title || "").trim() || `Meeting with ${name || "guest"}`;

  if (!start || !name) {
    return NextResponse.json(
      { error: "Name and start time are required" },
      { status: 400 }
    );
  }

  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: "Invalid start" }, { status: 400 });
  }
  const endDate = new Date(
    startDate.getTime() + (file.settings.slotMinutes || 30) * 60000
  );
  const dateStr = startDate.toISOString().slice(0, 10);

  if (link.dates.length && !link.dates.includes(dateStr)) {
    return NextResponse.json(
      { error: "Date not allowed on this link" },
      { status: 400 }
    );
  }

  const rangeEnd = new Date(startDate);
  rangeEnd.setDate(rangeEnd.getDate() + 1);
  const available = computeAvailableSlots(file, dateStr, rangeEnd.toISOString().slice(0, 10), {
    allowedDates: link.dates.length ? link.dates : null,
  });
  const ok = available.some(
    (s) => new Date(s.start).getTime() === startDate.getTime()
  );
  if (!ok) {
    return NextResponse.json(
      { error: "That slot is no longer available" },
      { status: 409 }
    );
  }

  const event: CalendarEvent = {
    id: uid("cal"),
    title,
    type: "appointment",
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    location: String(body.location || "").trim(),
    url: "",
    notes: "",
    status: "scheduled",
    bookingSource: "public_temp",
    bookerName: name,
    bookerEmail: email,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  file.events.unshift(event);
  await writeCalendarFile(file);

  return NextResponse.json(
    {
      id: event.id,
      title: event.title,
      start: event.start,
      end: event.end,
      status: event.status,
      bookerName: event.bookerName,
    },
    { status: 201 }
  );
}
