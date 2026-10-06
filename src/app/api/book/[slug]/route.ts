import { NextRequest, NextResponse } from "next/server";
import {
  computeAvailableSlots,
  findPermanentBySlug,
  readCalendarFile,
  writeCalendarFile,
} from "@/lib/calendar-store";
import { nowIso, uid } from "@/lib/store";
import { CalendarEvent } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const file = await readCalendarFile();
  const settings = findPermanentBySlug(file, params.slug);
  if (!settings) {
    return NextResponse.json(
      { error: "Booking page not found or disabled" },
      { status: 404 }
    );
  }

  const { searchParams } = new URL(req.url);
  const from =
    searchParams.get("from") || new Date().toISOString().slice(0, 10);
  const toDate = new Date(from);
  toDate.setDate(toDate.getDate() + 21);
  const to = searchParams.get("to") || toDate.toISOString().slice(0, 10);

  const slots = computeAvailableSlots(file, from, to);
  return NextResponse.json({
    ownerDisplayName: settings.ownerDisplayName,
    timezone: settings.timezone,
    slotMinutes: settings.slotMinutes,
    slots,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const file = await readCalendarFile();
  const settings = findPermanentBySlug(file, params.slug);
  if (!settings) {
    return NextResponse.json(
      { error: "Booking page not found or disabled" },
      { status: 404 }
    );
  }

  const body = await req.json();
  const start = String(body.start || "");
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const title = String(body.title || "").trim() || `Meeting with ${name || "guest"}`;

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
    startDate.getTime() + (settings.slotMinutes || 30) * 60000
  );
  const dateStr = startDate.toISOString().slice(0, 10);
  const dayEnd = new Date(startDate);
  dayEnd.setDate(dayEnd.getDate() + 1);
  const available = computeAvailableSlots(
    file,
    dateStr,
    dayEnd.toISOString().slice(0, 10)
  );
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
    notes: "", // public bookings do not set private owner notes
    status: "scheduled",
    bookingSource: "public_permanent",
    bookerName: name,
    bookerEmail: email,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  file.events.unshift(event);
  await writeCalendarFile(file);

  // Return public projection — no notes field exposure of other events
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
