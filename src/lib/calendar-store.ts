import {
  CalendarEvent,
  CalendarFile,
  PublicSlot,
  TempBookingLink,
} from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

export const DEFAULT_CALENDAR: CalendarFile = {
  settings: {
    permanentSlug: "me",
    permanentEnabled: true,
    slotMinutes: 30,
    ownerDisplayName: "",
    timezone: "Asia/Kolkata",
  },
  events: [],
  weeklyAvailability: [],
  dateWindows: [],
  tempLinks: [],
};

const KEY = "calendar";

export async function readCalendarFile(): Promise<CalendarFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<CalendarFile>("calendar.json");
    if (!legacy) return structuredClone(DEFAULT_CALENDAR);
    return {
      settings: { ...DEFAULT_CALENDAR.settings, ...(legacy.settings || {}) },
      events: Array.isArray(legacy.events) ? legacy.events : [],
      weeklyAvailability: Array.isArray(legacy.weeklyAvailability)
        ? legacy.weeklyAvailability
        : [],
      dateWindows: Array.isArray(legacy.dateWindows) ? legacy.dateWindows : [],
      tempLinks: Array.isArray(legacy.tempLinks) ? legacy.tempLinks : [],
    };
  });
}

export async function writeCalendarFile(data: CalendarFile): Promise<void> {
  await setDoc(KEY, data);
}

export function stripNotes(e: CalendarEvent) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { notes, ...rest } = e;
  void notes;
  return rest;
}

function parseHm(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && aEnd > bStart;
}

/** Windows for a single local date (YYYY-MM-DD), merging weekly + date-specific. */
export function windowsForDate(
  file: CalendarFile,
  dateStr: string
): { startTime: string; endTime: string }[] {
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = d.getDay();
  const weekly = file.weeklyAvailability
    .filter((w) => w.dayOfWeek === dow)
    .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
  const specific = file.dateWindows
    .filter((w) => w.date === dateStr)
    .map((w) => ({ startTime: w.startTime, endTime: w.endTime }));
  return [...weekly, ...specific];
}

function enumerateDays(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}

/**
 * Build bookable slots in [fromDate, toDate] (inclusive YYYY-MM-DD).
 * Blocks against non-cancelled events.
 */
export function computeAvailableSlots(
  file: CalendarFile,
  fromDate: string,
  toDate: string,
  opts?: { allowedDates?: string[] | null }
): PublicSlot[] {
  const slotMin = file.settings.slotMinutes || 30;
  const busy = file.events.filter((e) => e.status !== "cancelled");
  const allowed = opts?.allowedDates?.length
    ? new Set(opts.allowedDates)
    : null;
  const slots: PublicSlot[] = [];
  const now = new Date();

  for (const dateStr of enumerateDays(fromDate, toDate)) {
    if (allowed && !allowed.has(dateStr)) continue;
    const windows = windowsForDate(file, dateStr);
    for (const win of windows) {
      const { h: sh, m: sm } = parseHm(win.startTime);
      const { h: eh, m: em } = parseHm(win.endTime);
      const winStart = new Date(`${dateStr}T00:00:00`);
      winStart.setHours(sh, sm, 0, 0);
      const winEnd = new Date(`${dateStr}T00:00:00`);
      winEnd.setHours(eh, em, 0, 0);

      let cursor = new Date(winStart);
      while (cursor.getTime() + slotMin * 60000 <= winEnd.getTime()) {
        const slotEnd = new Date(cursor.getTime() + slotMin * 60000);
        if (slotEnd <= now) {
          cursor = slotEnd;
          continue;
        }
        const taken = busy.some((e) => {
          const es = new Date(e.start);
          const ee = new Date(e.end);
          return overlaps(cursor, slotEnd, es, ee);
        });
        if (!taken) {
          slots.push({
            start: cursor.toISOString(),
            end: slotEnd.toISOString(),
          });
        }
        cursor = slotEnd;
      }
    }
  }
  return slots;
}

export function isTempLinkActive(
  link: TempBookingLink,
  now = new Date()
): boolean {
  if (link.revoked) return false;
  if (new Date(link.expiresAt) <= now) return false;
  return true;
}

export function findPermanentBySlug(file: CalendarFile, slug: string) {
  if (!file.settings.permanentEnabled) return null;
  if (file.settings.permanentSlug !== slug) return null;
  return file.settings;
}
