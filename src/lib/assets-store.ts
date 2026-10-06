import { promises as fs } from "fs";
import path from "path";
import { Asset } from "./types";

const ASSETS_PATH = path.join(process.cwd(), "data", "assets.json");

export type AssetsFile = { assets: Asset[] };

export async function readAssetsFile(): Promise<AssetsFile> {
  try {
    const raw = await fs.readFile(ASSETS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AssetsFile;
    return { assets: Array.isArray(parsed.assets) ? parsed.assets : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: AssetsFile = { assets: [] };
      await writeAssetsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeAssetsFile(data: AssetsFile): Promise<void> {
  await fs.writeFile(ASSETS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
