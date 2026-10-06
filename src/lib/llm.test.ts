import assert from "node:assert/strict";
import { buildCompactContext, callLlm, type LlmResolved } from "./llm";
import { DEFAULT_MODELS, LLM_PROVIDERS } from "./llm-defaults";
import {
  migrateStaleModelId,
  normalizeGeminiModelId,
  preferGeminiFlashModel,
} from "./llm-model-ids";
import type { Project, StoreData } from "./types";

const emptyStore: StoreData = {
  notes: [
    {
      id: "n1",
      title: "Database backup",
      content: "<p>Weekly dump</p>",
      linkedMeetingIds: [],
      linkedThoughtIds: [],
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  tasks: [
    {
      id: "t1",
      title: "Update docs",
      done: false,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ],
  meetings: [],
  thoughts: [],
  memories: [],
  chatHistory: [],
  profile: {
    name: "Alex",
    language: "English (India)",
    voice: "Default voice",
    readAloud: false,
  },
};

const sampleProject: Project = {
  id: "p1",
  name: "Bi-Polar",
  description: "",
  status: "in_progress",
  url: "",
  tags: [],
  startedAt: "",
  releasedAt: "",
  notes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function baseConfig(over: Partial<LlmResolved> = {}): LlmResolved {
  return {
    enabled: true,
    provider: "openai",
    model: "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
    apiKey: null,
    ...over,
  };
}

async function main() {
  assert.ok(LLM_PROVIDERS.includes("openai"));
  assert.ok(LLM_PROVIDERS.includes("ollama"));
  assert.equal(DEFAULT_MODELS.openai, "gpt-4o-mini");
  assert.equal(DEFAULT_MODELS.gemini, "gemini-2.5-flash");
  assert.equal(
    normalizeGeminiModelId("models/gemini-2.5-flash"),
    "gemini-2.5-flash"
  );
  assert.equal(
    migrateStaleModelId("gemini", "gemini-2.0-flash"),
    "gemini-2.5-flash"
  );
  assert.equal(
    migrateStaleModelId("gemini", "gemini-3.8-flash"),
    "gemini-2.5-flash"
  );
  assert.equal(
    migrateStaleModelId("gemini", "models/gemini-3.8-flash"),
    "gemini-2.5-flash"
  );
  assert.equal(
    preferGeminiFlashModel(
      ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-1.5-flash"],
      "gemini-2.5-flash"
    ),
    "gemini-2.5-flash"
  );

  const ctx = buildCompactContext(emptyStore, {
    secrets: [
      {
        id: "s1",
        name: "Demo API key",
        category: "api",
        tags: [],
        notes: "",
        hasValue: true,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    projects: [sampleProject],
  });

  assert.match(ctx, /Alex/);
  assert.match(ctx, /Database backup/);
  assert.match(ctx, /Update docs/);
  assert.match(ctx, /Demo API key/);
  assert.match(ctx, /names only/);
  assert.match(ctx, /Bi-Polar/);
  assert.doesNotMatch(ctx, /sk-live|password123|secret-value/i);

  const disabled = await callLlm({
    message: "hi",
    context: ctx,
    config: baseConfig({ enabled: false }),
  });
  assert.equal(disabled.ok, false);
  if (!disabled.ok) assert.equal(disabled.error, "LLM disabled");

  const noKey = await callLlm({
    message: "hi",
    context: ctx,
    config: baseConfig({ apiKey: null, provider: "openai" }),
  });
  assert.equal(noKey.ok, false);
  if (!noKey.ok) assert.match(noKey.error, /No API key/i);

  const ollama = await callLlm({
    message: "hi",
    context: ctx,
    config: baseConfig({
      provider: "ollama",
      apiKey: null,
      baseUrl: "http://127.0.0.1:9",
      model: "llama3.2",
    }),
  });
  assert.equal(ollama.ok, false);
  if (!ollama.ok) {
    assert.doesNotMatch(ollama.error, /Bearer\s+[A-Za-z0-9._-]+/);
  }

  console.log("llm.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
