import { promises as fs } from "fs";
import path from "path";
import { Recurring, RecurringPeriod } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "recurrings.json");

export type RecurringsFile = { recurrings: Recurring[] };

export async function readRecurringsFile(): Promise<RecurringsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as RecurringsFile;
    return { recurrings: Array.isArray(parsed.recurrings) ? parsed.recurrings : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: RecurringsFile = { recurrings: [] };
      await writeRecurringsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeRecurringsFile(data: RecurringsFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Advance next due date by billing period. */
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
