import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CALENDAR } from "./calendar-store";
import { DEFAULT_INTENTS } from "./intents";
import { DEFAULT_LLM_SETTINGS } from "./llm-store";
import { seedCategories } from "./secret-categories-store";
import type { StoreData } from "./types";
import { SYSTEM_RESET_PHRASE } from "./system-reset-phrase";

export { SYSTEM_RESET_PHRASE };

/** Resolve data directory at call time (supports SYSTEM_RESET_DATA_DIR in tests). */
export function dataDir(): string {
  const override = process.env.SYSTEM_RESET_DATA_DIR?.trim();
  return override || path.join(process.cwd(), "data");
}

export type SystemResetReport = {
  wipedFiles: string[];
  reseeded: string[];
  clearedUploads: string[];
  kept: string[];
};

const EMPTY_STORE: StoreData = {
  notes: [],
  tasks: [],
  meetings: [],
  thoughts: [],
  memories: [],
  profile: {
    name: "",
    language: "English (India)",
    voice: "Default voice",
    readAloud: false,
  },
  chatHistory: [],
};

async function writeJson(rel: string, data: unknown): Promise<void> {
  const full = path.join(dataDir(), rel);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function emptyDir(dir: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        await fs.rm(full, { recursive: true, force: true });
      } else {
        await fs.unlink(full);
      }
    }
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      await fs.mkdir(dir, { recursive: true });
      return true;
    }
    throw err;
  }
}

/**
 * Wipe local app data and return to first-run state.
 *
 * Wiped: workspace JSON modules, secrets values, uploads, auth user,
 *        LLM settings (incl. stored API/DB password ciphertexts), chat history,
 *        custom intents (restored to built-in defaults).
 * Reseeded: secret category names → built-in defaults (custom categories cleared).
 * Kept: data/.secrets-master-key (vault key file) so encryption material survives;
 *       env SECRETS_MASTER_KEY / SESSION_SECRET / LLM_* env keys are untouched.
 * Not touched: external Postgres/pgvector contents (re-migrate/reindex after setup).
 */
export async function performSystemReset(): Promise<SystemResetReport> {
  const wipedFiles: string[] = [];
  const reseeded: string[] = [];
  const clearedUploads: string[] = [];
  const kept: string[] = [
    "data/.secrets-master-key (vault key file, if present)",
    "environment variables (SECRETS_MASTER_KEY, SESSION_SECRET, LLM_*, DATABASE_*)",
    "external Postgres / pgvector tables (not cleared)",
  ];

  await writeJson("store.json", EMPTY_STORE);
  wipedFiles.push(
    "store.json (notes, tasks, meetings, thoughts, memories, profile, chatHistory)"
  );

  await writeJson("assets.json", { assets: [] });
  wipedFiles.push("assets.json");

  await writeJson("secrets.json", { secrets: [] });
  wipedFiles.push("secrets.json");

  await writeJson("projects.json", { projects: [] });
  wipedFiles.push("projects.json");

  await writeJson("clients.json", {
    clients: [],
    subscriptions: [],
    payments: [],
  });
  wipedFiles.push("clients.json");

  await writeJson("recurrings.json", { recurrings: [] });
  wipedFiles.push("recurrings.json");

  await writeJson("finance.json", { transactions: [], fixedItems: [] });
  wipedFiles.push("finance.json");

  await writeJson("belongings.json", { belongings: [] });
  wipedFiles.push("belongings.json");

  const cal = structuredClone(DEFAULT_CALENDAR);
  cal.settings = {
    ...cal.settings,
    ownerDisplayName: "",
    permanentEnabled: true,
  };
  cal.events = [];
  cal.weeklyAvailability = [];
  cal.dateWindows = [];
  cal.tempLinks = [];
  await writeJson("calendar.json", cal);
  wipedFiles.push("calendar.json");

  await writeJson("jobs.json", { jobs: [] });
  wipedFiles.push("jobs.json");

  await writeJson("skills.json", { skills: [] });
  wipedFiles.push("skills.json");

  await writeJson("library.json", { items: [] });
  wipedFiles.push("library.json");

  await writeJson("auth.json", { user: null });
  wipedFiles.push("auth.json (account removed → first-run setup)");

  await writeJson("llm-settings.json", {
    ...DEFAULT_LLM_SETTINGS,
    apiKeyCiphertext: null,
    pgPasswordCiphertext: null,
    updatedAt: new Date().toISOString(),
  });
  wipedFiles.push(
    "llm-settings.json (provider keys & RAG/pg settings cleared)"
  );

  await writeJson("intents.json", {
    intents: DEFAULT_INTENTS.map((i) => ({ ...i })),
  });
  reseeded.push("intents.json → built-in default intents");

  await writeJson("secret-categories.json", {
    categories: seedCategories(),
  });
  reseeded.push("secret-categories.json → built-in default categories");

  const resumes = path.join(dataDir(), "uploads", "resumes");
  const library = path.join(dataDir(), "uploads", "library");
  if (await emptyDir(resumes)) clearedUploads.push("uploads/resumes/");
  if (await emptyDir(library)) clearedUploads.push("uploads/library/");

  return { wipedFiles, reseeded, clearedUploads, kept };
}
