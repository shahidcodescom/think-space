import { Recurring, RecurringPeriod } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "recurrings";

export type RecurringsFile = { recurrings: Recurring[] };

export async function readRecurringsFile(): Promise<RecurringsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<RecurringsFile>("recurrings.json");
    return { recurrings: Array.isArray(legacy?.recurrings) ? legacy!.recurrings : [] };
  });
}

export async function writeRecurringsFile(data: RecurringsFile): Promise<void> {
  await setDoc(KEY, data);
}

export function bumpDueDate(
  isoDate: string,
  period: RecurringPeriod,
  customDays = 30
): string {
  const base =
    isoDate && isoDate.length >= 10
      ? isoDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  const d = new Date(`${base}T12:00:00`);
  if (period === "weekly") d.setDate(d.getDate() + 7);
  else if (period === "monthly") d.setMonth(d.getMonth() + 1);
  else if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + customDays);
  return d.toISOString().slice(0, 10);
}
