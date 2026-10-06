import { promises as fs } from "fs";
import path from "path";
import { JobApplication } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "jobs.json");
export const RESUMES_DIR = path.join(process.cwd(), "data", "uploads", "resumes");

export type JobsFile = { jobs: JobApplication[] };

export async function readJobsFile(): Promise<JobsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as JobsFile;
    return { jobs: Array.isArray(parsed.jobs) ? parsed.jobs : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: JobsFile = { jobs: [] };
      await writeJobsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeJobsFile(data: JobsFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
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
