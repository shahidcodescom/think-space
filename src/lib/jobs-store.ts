import { promises as fs } from "fs";
import path from "path";
import { JobApplication } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "jobs";
export const RESUMES_DIR = path.join(process.cwd(), "data", "uploads", "resumes");

export type JobsFile = { jobs: JobApplication[] };

export async function readJobsFile(): Promise<JobsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<JobsFile>("jobs.json");
    return { jobs: Array.isArray(legacy?.jobs) ? legacy!.jobs : [] };
  });
}

export async function writeJobsFile(data: JobsFile): Promise<void> {
  await setDoc(KEY, data);
}

export async function ensureResumesDir(): Promise<void> {
  await fs.mkdir(RESUMES_DIR, { recursive: true });
}

/** Resolve a stored relative resume path safely inside RESUMES_DIR. */
export function resolveResumePath(relative: string): string | null {
  if (!relative) return null;
  const normalized = relative.replace(/\\/g, "/");
  if (normalized.includes("..")) return null;
  const abs = path.isAbsolute(normalized)
    ? normalized
    : path.join(process.cwd(), normalized);
  const resumesRoot = path.resolve(RESUMES_DIR);
  const resolved = path.resolve(abs);
  if (!resolved.startsWith(resumesRoot + path.sep) && resolved !== resumesRoot) {
    return null;
  }
  return resolved;
}
