import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_CALENDAR } from "./calendar-store";
import { DEFAULT_INTENTS } from "./intents";
import { DEFAULT_LLM_SETTINGS } from "./llm-store";
import { seedCategories } from "./secret-categories-store";
import { EMPTY_STORE } from "./store";
import { SYSTEM_RESET_PHRASE } from "./system-reset-phrase";
import { ensureDatabase, wipeAppData } from "./db";
import { setDoc } from "./db-docs";
import { clearChatMemory } from "./chat-memory";

export { SYSTEM_RESET_PHRASE };

export type SystemResetReport = {
  wipedFiles: string[];
  reseeded: string[];
  clearedUploads: string[];
  kept: string[];
};

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
 * Wipe Postgres app data + uploads; return to first-run state.
 *
 * Wiped: all app_documents keys, rag_embeddings, uploads, account.
 * Reseeded: default secret categories & built-in intents; empty module docs.
 * Kept: data/.secrets-master-key; env vars; DATABASE_URL itself.
 */
export async function performSystemReset(): Promise<SystemResetReport> {
  await ensureDatabase();
  await wipeAppData();

  const wipedFiles = [
    "app_documents (all keys)",
    "rag_embeddings",
    "auth (account removed → first-run setup)",
    "llm-settings (stored API key cleared)",
  ];
  const reseeded: string[] = [];
  const clearedUploads: string[] = [];
  const kept = [
    "data/.secrets-master-key (vault key file, if present)",
    "environment variables (DATABASE_URL, SECRETS_MASTER_KEY, SESSION_SECRET, LLM_*)",
  ];

  await setDoc("store", {
    ...EMPTY_STORE,
    profile: { ...EMPTY_STORE.profile },
  });
  await setDoc("task-workspaces", { workspaces: [] });
  await setDoc("assets", { assets: [] });
  await setDoc("secrets", { secrets: [] });
  await setDoc("projects", { projects: [] });
  await setDoc("clients", { clients: [], subscriptions: [], payments: [] });
  await setDoc("recurrings", { recurrings: [] });
  await setDoc("finance", { transactions: [], fixedItems: [] });
  await setDoc("belongings", { belongings: [] });
  const cal = structuredClone(DEFAULT_CALENDAR);
  cal.settings = { ...cal.settings, ownerDisplayName: "", permanentEnabled: true };
  await setDoc("calendar", cal);
  await setDoc("jobs", { jobs: [] });
  await setDoc("skills", { skills: [] });
  await setDoc("library", { items: [] });
  await setDoc("auth", { user: null });
  await setDoc("llm-settings", {
    ...DEFAULT_LLM_SETTINGS,
    apiKeyCiphertext: null,
    updatedAt: new Date().toISOString(),
  });
  await setDoc("intents", {
    intents: DEFAULT_INTENTS.map((i) => ({ ...i })),
  });
  reseeded.push("intents → built-in defaults");
  await setDoc("secret-categories", { categories: seedCategories() });
  reseeded.push("secret-categories → built-in defaults");

  const dataDir = path.join(process.cwd(), "data");
  if (await emptyDir(path.join(dataDir, "uploads", "resumes"))) {
    clearedUploads.push("uploads/resumes/");
  }
  if (await emptyDir(path.join(dataDir, "uploads", "library"))) {
    clearedUploads.push("uploads/library/");
  }

  const redisCleared = await clearChatMemory();
  if (redisCleared) wipedFiles.push("redis thinking chat memory");
  else kept.push("redis chat memory (unavailable or REDIS_URL unset)");

  return { wipedFiles, reseeded, clearedUploads, kept };
}
