import assert from "node:assert/strict";
import { promises as fs } from "fs";
import path from "path";
import { SYSTEM_RESET_PHRASE } from "./system-reset-phrase";
import { performSystemReset } from "./system-reset";
import { getDoc } from "./db-docs";
import { ensureDatabase, requireDatabaseUrl } from "./db";

async function main() {
  assert.equal(SYSTEM_RESET_PHRASE, "RESET");

  if (!process.env.DATABASE_URL?.trim()) {
    console.log("system-reset.test.ts: skipped (DATABASE_URL unset)");
    return;
  }

  requireDatabaseUrl();
  await ensureDatabase();

  // Seed a fake account doc then reset
  const { setDoc } = await import("./db-docs");
  await setDoc("auth", {
    user: {
      id: "u1",
      username: "demo",
      email: "d@example.com",
      passwordHash: "$2a$12$fake",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  });
  await setDoc("store", {
    notes: [{ id: "n1" }],
    tasks: [],
    meetings: [],
    thoughts: [],
    memories: [],
    profile: {
      name: "X",
      language: "English (India)",
      voice: "Default voice",
      readAloud: false,
    },
    chatHistory: [{ id: "c1" }],
  });

  const uploads = path.join(process.cwd(), "data", "uploads", "resumes");
  await fs.mkdir(uploads, { recursive: true });
  await fs.writeFile(path.join(uploads, "cv-test.pdf"), "pdf");

  const report = await performSystemReset();
  assert.ok(report.wipedFiles.some((f) => f.includes("app_documents")));
  assert.ok(report.reseeded.some((f) => f.includes("secret-categories")));

  const auth = await getDoc<{ user: null }>("auth");
  assert.equal(auth?.user ?? null, null);

  const store = await getDoc<{ notes: unknown[]; chatHistory: unknown[] }>("store");
  assert.equal(store?.notes.length, 0);
  assert.equal(store?.chatHistory.length, 0);

  const resumes = await fs.readdir(uploads);
  assert.ok(!resumes.includes("cv-test.pdf"));

  console.log("system-reset.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
