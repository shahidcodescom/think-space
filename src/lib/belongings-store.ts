import { promises as fs } from "fs";
import path from "path";
import { Belonging } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "belongings.json");

export type BelongingsFile = { belongings: Belonging[] };

export async function readBelongingsFile(): Promise<BelongingsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as BelongingsFile;
    return {
      belongings: Array.isArray(parsed.belongings) ? parsed.belongings : [],
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: BelongingsFile = { belongings: [] };
      await writeBelongingsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeBelongingsFile(data: BelongingsFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Group belongings by location for "where is" views. */
export function groupByLocation(items: Belonging[]): Record<string, Belonging[]> {
  const map: Record<string, Belonging[]> = {};
  for (const b of items) {
    const key = b.location.trim() || "Unknown";
    if (!map[key]) map[key] = [];
    map[key].push(b);
  }
  return map;
}
