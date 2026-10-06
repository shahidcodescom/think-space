import { promises as fs } from "fs";
import path from "path";
import { StoreData } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "store.json");

export async function readStore(): Promise<StoreData> {
  const raw = await fs.readFile(DATA_PATH, "utf-8");
  return JSON.parse(raw) as StoreData;
}

export async function writeStore(data: StoreData): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
