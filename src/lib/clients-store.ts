import { Client, Payment, Subscription } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "clients";

export type ClientsFile = {
  clients: Client[];
  subscriptions: Subscription[];
  payments: Payment[];
};

export async function readClientsFile(): Promise<ClientsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<ClientsFile>("clients.json");
    return {
      clients: Array.isArray(legacy?.clients) ? legacy!.clients : [],
      subscriptions: Array.isArray(legacy?.subscriptions)
        ? legacy!.subscriptions
        : [],
      payments: Array.isArray(legacy?.payments) ? legacy!.payments : [],
    };
  });
}

export async function writeClientsFile(data: ClientsFile): Promise<void> {
  await setDoc(KEY, data);
}

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
