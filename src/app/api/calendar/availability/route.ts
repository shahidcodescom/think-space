import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";
import { uid } from "@/lib/store";
import { DateAvailabilityWindow, WeeklyAvailabilitySlot } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const file = await readCalendarFile();
  return NextResponse.json({
    weeklyAvailability: file.weeklyAvailability,
    dateWindows: file.dateWindows,
    settings: {
      slotMinutes: file.settings.slotMinutes,
      timezone: file.settings.timezone,
    },
  });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const file = await readCalendarFile();

  if (Array.isArray(body.weeklyAvailability)) {
    file.weeklyAvailability = body.weeklyAvailability.map(
      (w: Partial<WeeklyAvailabilitySlot>) => ({
        id: w.id || uid("wa"),
        dayOfWeek: Number(w.dayOfWeek) % 7,
        startTime: String(w.startTime || "09:00").slice(0, 5),
        endTime: String(w.endTime || "17:00").slice(0, 5),
      })
    );
  }
  if (Array.isArray(body.dateWindows)) {
    file.dateWindows = body.dateWindows.map(
      (w: Partial<DateAvailabilityWindow>) => ({
        id: w.id || uid("dw"),
        date: String(w.date || "").slice(0, 10),
        startTime: String(w.startTime || "09:00").slice(0, 5),
        endTime: String(w.endTime || "17:00").slice(0, 5),
      })
    );
  }
  if (body.slotMinutes !== undefined) {
    const n = Number(body.slotMinutes);
    if (Number.isFinite(n) && n >= 15 && n <= 180) {
      file.settings.slotMinutes = n;
    }
  }

  await writeCalendarFile(file);
  return NextResponse.json({
    weeklyAvailability: file.weeklyAvailability,
    dateWindows: file.dateWindows,
    settings: {
      slotMinutes: file.settings.slotMinutes,
      timezone: file.settings.timezone,
    },
  });
}
