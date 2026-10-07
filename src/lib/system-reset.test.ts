import assert from "node:assert/strict";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { SYSTEM_RESET_PHRASE } from "./system-reset-phrase";
import { performSystemReset } from "./system-reset";

async function main() {
  assert.equal(SYSTEM_RESET_PHRASE, "RESET");

  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "bipolar-reset-"));
  const data = path.join(tmp, "data");
  await fs.mkdir(path.join(data, "uploads", "resumes"), { recursive: true });
  await fs.mkdir(path.join(data, "uploads", "library"), { recursive: true });
  await fs.writeFile(
    path.join(data, "store.json"),
    JSON.stringify({
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
    })
  );
  await fs.writeFile(
    path.join(data, "auth.json"),
    JSON.stringify({
      user: {
        id: "u1",
        username: "demo",
        email: "d@example.com",
        passwordHash: "$2a$12$fake",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    })
  );
  await fs.writeFile(
    path.join(data, "secrets.json"),
    JSON.stringify({ secrets: [{ id: "s1", name: "k" }] })
  );
  await fs.writeFile(
    path.join(data, "llm-settings.json"),
    JSON.stringify({ enabled: true, apiKeyCiphertext: "iv.tag.ct" })
  );
  await fs.writeFile(path.join(data, "uploads", "resumes", "cv.pdf"), "pdf");
  await fs.writeFile(path.join(data, ".secrets-master-key"), "keep-me\n");

  process.env.SYSTEM_RESET_DATA_DIR = data;
  try {
    const report = await performSystemReset();
    assert.ok(report.wipedFiles.some((f) => f.includes("auth.json")));
    assert.ok(report.wipedFiles.some((f) => f.includes("store.json")));
    assert.ok(report.reseeded.some((f) => f.includes("secret-categories")));
    assert.ok(report.kept.some((f) => f.includes(".secrets-master-key")));

    const auth = JSON.parse(await fs.readFile(path.join(data, "auth.json"), "utf-8"));
    assert.equal(auth.user, null);

    const store = JSON.parse(await fs.readFile(path.join(data, "store.json"), "utf-8"));
    assert.equal(store.notes.length, 0);
    assert.equal(store.chatHistory.length, 0);

    const llm = JSON.parse(
      await fs.readFile(path.join(data, "llm-settings.json"), "utf-8")
    );
    assert.equal(llm.apiKeyCiphertext, null);
    assert.equal(llm.enabled, false);

    const cats = JSON.parse(
      await fs.readFile(path.join(data, "secret-categories.json"), "utf-8")
    );
    assert.ok(cats.categories.length >= 1);

    const key = await fs.readFile(path.join(data, ".secrets-master-key"), "utf-8");
    assert.match(key, /keep-me/);

    const resumes = await fs.readdir(path.join(data, "uploads", "resumes"));
    assert.equal(resumes.length, 0);
  } finally {
    delete process.env.SYSTEM_RESET_DATA_DIR;
    await fs.rm(tmp, { recursive: true, force: true });
  }

  console.log("system-reset.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
