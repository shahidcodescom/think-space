import { Asset } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "assets";

export type AssetsFile = { assets: Asset[] };

export async function readAssetsFile(): Promise<AssetsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<AssetsFile>("assets.json");
    return { assets: Array.isArray(legacy?.assets) ? legacy!.assets : [] };
  });
}

export async function writeAssetsFile(data: AssetsFile): Promise<void> {
  await setDoc(KEY, data);
}
