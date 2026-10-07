import { promises as fs } from "fs";
import path from "path";
import { LibraryItem } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "library";
export const LIBRARY_DIR = path.join(process.cwd(), "data", "uploads", "library");

export type LibraryFile = { items: LibraryItem[] };

export async function readLibraryFile(): Promise<LibraryFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<LibraryFile>("library.json");
    return { items: Array.isArray(legacy?.items) ? legacy!.items : [] };
  });
}

export async function writeLibraryFile(data: LibraryFile): Promise<void> {
  await setDoc(KEY, data);
}

export async function ensureLibraryDir(): Promise<void> {
  await fs.mkdir(LIBRARY_DIR, { recursive: true });
}

export function resolveLibraryPath(relative: string): string | null {
  if (!relative) return null;
  const normalized = relative.replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  const abs = path.isAbsolute(normalized)
    ? normalized
    : path.join(process.cwd(), normalized);
  const root = path.resolve(LIBRARY_DIR);
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return null;
  }
  return resolved;
}

export function inferTypeFromMimeOrName(
  mime: string,
  name: string
): "image" | "pdf" | "document" | "other" {
  const lower = (name || "").toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/.test(lower)) {
    return "image";
  }
  if (mime === "application/pdf" || lower.endsWith(".pdf")) return "pdf";
  if (
    /document|msword|officedocument|text\//.test(mime) ||
    /\.(docx?|xlsx?|pptx?|txt|rtf|odt|md)$/.test(lower)
  ) {
    return "document";
  }
  return "other";
}
