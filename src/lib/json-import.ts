import { promises as fs } from "fs";
import path from "path";

/** One-time import helper: read legacy data/*.json if present. */
export async function readLegacyJson<T>(filename: string): Promise<T | null> {
  const full = path.join(process.cwd(), "data", filename);
  try {
    const raw = await fs.readFile(full, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
