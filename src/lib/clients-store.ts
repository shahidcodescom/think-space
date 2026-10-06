import { promises as fs } from "fs";
import path from "path";
import { Client, Payment, Subscription } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "clients.json");

export type ClientsFile = {
  clients: Client[];
  subscriptions: Subscription[];
  payments: Payment[];
};

export async function readClientsFile(): Promise<ClientsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ClientsFile;
    return {
      clients: Array.isArray(parsed.clients) ? parsed.clients : [],
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      payments: Array.isArray(parsed.payments) ? parsed.payments : [],
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: ClientsFile = { clients: [], subscriptions: [], payments: [] };
      await writeClientsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeClientsFile(data: ClientsFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Add months/years to an ISO date (YYYY-MM-DD). */
export function bumpRenewalDate(
  isoDate: string,
  period: "monthly" | "yearly" | "custom",
  customDays = 30
): string {
  const base = isoDate && isoDate.length >= 10 ? isoDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const d = new Date(`${base}T12:00:00`);
  if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else if (period === "monthly") d.setMonth(d.getMonth() + 1);
  else d.setDate(d.getDate() + customDays);
  return d.toISOString().slice(0, 10);
}
