import { Belonging } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "belongings";

export type BelongingsFile = { belongings: Belonging[] };

export async function readBelongingsFile(): Promise<BelongingsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<BelongingsFile>("belongings.json");
    return { belongings: Array.isArray(legacy?.belongings) ? legacy!.belongings : [] };
  });
}

export async function writeBelongingsFile(data: BelongingsFile): Promise<void> {
  await setDoc(KEY, data);
}

export function groupByLocation(items: Belonging[]): Record<string, Belonging[]> {
  const map: Record<string, Belonging[]> = {};
  for (const b of items) {
    const key = b.location.trim() || "Unknown";
    if (!map[key]) map[key] = [];
    map[key].push(b);
  }
  return map;
}
