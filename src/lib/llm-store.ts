import { promises as fs } from "fs";
import path from "path";
import { encryptSecret, decryptSecret } from "./crypto";
import { DEFAULT_MODELS } from "./llm-defaults";
import { migrateStaleModelId } from "./llm-model-ids";
import { RAG_MODULE_IDS } from "./rag-modules";
import { nowIso } from "./store";
import { LlmProvider, LlmSettingsPublic, LlmSettingsStored } from "./types";

export { DEFAULT_BASE_URLS, DEFAULT_MODELS } from "./llm-defaults";

const DATA_PATH = path.join(process.cwd(), "data", "llm-settings.json");

export const DEFAULT_LLM_SETTINGS: LlmSettingsStored = {
  enabled: false,
  provider: "openai",
  model: DEFAULT_MODELS.openai,
  baseUrl: "",
  apiKeyCiphertext: null,
  temperature: 0.4,
  maxTokens: 1024,
  systemPrompt: "",
  ragEnabled: true,
  ragTopK: 8,
  ragChunkSize: 280,
  contextCharLimit: 12000,
  ragModules: [...RAG_MODULE_IDS],
  pgEnabled: false,
  pgConnectionString: "",
  pgHost: "127.0.0.1",
  pgPort: 5432,
  pgDatabase: "bipolar",
  pgUser: "postgres",
  pgPasswordCiphertext: null,
  updatedAt: new Date(0).toISOString(),
};

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function normalizeSettings(
  parsed: Partial<LlmSettingsStored>
): LlmSettingsStored {
  const provider = (parsed.provider ||
    DEFAULT_LLM_SETTINGS.provider) as LlmProvider;
  const model = migrateStaleModelId(
    provider,
    parsed.model || DEFAULT_MODELS[provider]
  );
  const ragModules = Array.isArray(parsed.ragModules)
    ? parsed.ragModules.filter((m) =>
        (RAG_MODULE_IDS as readonly string[]).includes(m)
      )
    : [...RAG_MODULE_IDS];
  return {
    ...DEFAULT_LLM_SETTINGS,
    ...parsed,
    enabled: Boolean(parsed.enabled),
    provider,
    model,
    baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
    apiKeyCiphertext: parsed.apiKeyCiphertext || null,
    temperature: clamp(
      Number(parsed.temperature),
      0,
      2,
      DEFAULT_LLM_SETTINGS.temperature
    ),
    maxTokens: clamp(
      Number(parsed.maxTokens),
      64,
      8192,
      DEFAULT_LLM_SETTINGS.maxTokens
    ),
    systemPrompt:
      typeof parsed.systemPrompt === "string" ? parsed.systemPrompt : "",
    ragEnabled:
      parsed.ragEnabled === undefined
        ? DEFAULT_LLM_SETTINGS.ragEnabled
        : Boolean(parsed.ragEnabled),
    ragTopK: clamp(
      Number(parsed.ragTopK),
      1,
      40,
      DEFAULT_LLM_SETTINGS.ragTopK
    ),
    ragChunkSize: clamp(
      Number(parsed.ragChunkSize),
      80,
      2000,
      DEFAULT_LLM_SETTINGS.ragChunkSize
    ),
    contextCharLimit: clamp(
      Number(parsed.contextCharLimit),
      1000,
      100000,
      DEFAULT_LLM_SETTINGS.contextCharLimit
    ),
    ragModules: ragModules.length ? ragModules : [...RAG_MODULE_IDS],
    pgEnabled: Boolean(parsed.pgEnabled),
    pgConnectionString:
      typeof parsed.pgConnectionString === "string"
        ? parsed.pgConnectionString
        : "",
    pgHost: typeof parsed.pgHost === "string" ? parsed.pgHost : "127.0.0.1",
    pgPort: clamp(Number(parsed.pgPort), 1, 65535, 5432),
    pgDatabase:
      typeof parsed.pgDatabase === "string" ? parsed.pgDatabase : "bipolar",
    pgUser: typeof parsed.pgUser === "string" ? parsed.pgUser : "postgres",
    pgPasswordCiphertext: parsed.pgPasswordCiphertext || null,
    updatedAt: parsed.updatedAt || DEFAULT_LLM_SETTINGS.updatedAt,
  };
}

export async function readLlmSettings(): Promise<LlmSettingsStored> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LlmSettingsStored>;
    return normalizeSettings(parsed);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      await writeLlmSettings(DEFAULT_LLM_SETTINGS);
      return { ...DEFAULT_LLM_SETTINGS, ragModules: [...RAG_MODULE_IDS] };
    }
    throw err;
  }
}

export async function writeLlmSettings(
  data: LlmSettingsStored
): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

export function envKeyForProvider(provider: LlmProvider): string | undefined {
  const map: Record<LlmProvider, string[]> = {
    openai: ["OPENAI_API_KEY", "LLM_API_KEY"],
    gemini: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "LLM_API_KEY"],
    claude: ["ANTHROPIC_API_KEY", "CLAUDE_API_KEY", "LLM_API_KEY"],
    openrouter: ["OPENROUTER_API_KEY", "LLM_API_KEY"],
    ollama: ["OLLAMA_API_KEY", "LLM_API_KEY"],
  };
  for (const name of map[provider]) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  const envProvider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (envProvider === provider) {
    const v = process.env.LLM_API_KEY?.trim();
    if (v) return v;
  }
  return undefined;
}

export async function getDecryptedApiKey(
  settings: LlmSettingsStored
): Promise<string | null> {
  if (settings.apiKeyCiphertext) {
    try {
      const key = await decryptSecret(settings.apiKeyCiphertext);
      if (key.trim()) return key.trim();
    } catch {
      /* fall through */
    }
  }
  return envKeyForProvider(settings.provider) || null;
}

export async function toPublicSettings(
  settings: LlmSettingsStored
): Promise<LlmSettingsPublic> {
  const envKey = Boolean(envKeyForProvider(settings.provider));
  const hasStored = Boolean(settings.apiKeyCiphertext);
  const envForce =
    process.env.LLM_ENABLED === "1" ||
    process.env.LLM_ENABLED === "true";
  const enabled = settings.enabled || envForce;
  let source: LlmSettingsPublic["source"] = "off";
  if (enabled) {
    source = hasStored ? "settings" : envKey ? "env" : "off";
  }
  const n = normalizeSettings(settings);
  return {
    enabled,
    provider: n.provider,
    model: n.model || DEFAULT_MODELS[n.provider],
    baseUrl: n.baseUrl || "",
    hasApiKey: hasStored,
    envKeyAvailable: envKey,
    source,
    temperature: n.temperature,
    maxTokens: n.maxTokens,
    systemPrompt: n.systemPrompt,
    ragEnabled: n.ragEnabled,
    ragTopK: n.ragTopK,
    ragChunkSize: n.ragChunkSize,
    contextCharLimit: n.contextCharLimit,
    ragModules: n.ragModules,
    pgEnabled: n.pgEnabled,
    pgConnectionString: n.pgConnectionString,
    pgHost: n.pgHost,
    pgPort: n.pgPort,
    pgDatabase: n.pgDatabase,
    pgUser: n.pgUser,
    hasPgPassword: Boolean(n.pgPasswordCiphertext),
  };
}

export async function updateLlmSettings(body: {
  enabled?: boolean;
  provider?: LlmProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string | null;
  clearApiKey?: boolean;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  ragEnabled?: boolean;
  ragTopK?: number;
  ragChunkSize?: number;
  contextCharLimit?: number;
  ragModules?: string[];
  pgEnabled?: boolean;
  pgConnectionString?: string;
  pgHost?: string;
  pgPort?: number;
  pgDatabase?: string;
  pgUser?: string;
  pgPassword?: string | null;
  clearPgPassword?: boolean;
}): Promise<LlmSettingsStored> {
  const current = await readLlmSettings();
  const providers: LlmProvider[] = [
    "openai",
    "gemini",
    "claude",
    "openrouter",
    "ollama",
  ];
  if (body.enabled !== undefined) current.enabled = Boolean(body.enabled);
  if (body.provider && providers.includes(body.provider)) {
    current.provider = body.provider;
    if (!body.model) current.model = DEFAULT_MODELS[body.provider];
  }
  if (typeof body.model === "string" && body.model.trim()) {
    current.model = migrateStaleModelId(current.provider, body.model.trim());
  } else {
    current.model = migrateStaleModelId(current.provider, current.model);
  }
  if (typeof body.baseUrl === "string") current.baseUrl = body.baseUrl.trim();
  if (body.clearApiKey) current.apiKeyCiphertext = null;
  else if (typeof body.apiKey === "string" && body.apiKey.trim()) {
    current.apiKeyCiphertext = await encryptSecret(body.apiKey.trim());
  }
  if (body.temperature !== undefined) current.temperature = body.temperature;
  if (body.maxTokens !== undefined) current.maxTokens = body.maxTokens;
  if (typeof body.systemPrompt === "string")
    current.systemPrompt = body.systemPrompt;
  if (body.ragEnabled !== undefined) current.ragEnabled = Boolean(body.ragEnabled);
  if (body.ragTopK !== undefined) current.ragTopK = body.ragTopK;
  if (body.ragChunkSize !== undefined) current.ragChunkSize = body.ragChunkSize;
  if (body.contextCharLimit !== undefined)
    current.contextCharLimit = body.contextCharLimit;
  if (Array.isArray(body.ragModules)) current.ragModules = body.ragModules;
  if (body.pgEnabled !== undefined) current.pgEnabled = Boolean(body.pgEnabled);
  if (typeof body.pgConnectionString === "string")
    current.pgConnectionString = body.pgConnectionString.trim();
  if (typeof body.pgHost === "string") current.pgHost = body.pgHost.trim();
  if (body.pgPort !== undefined) current.pgPort = body.pgPort;
  if (typeof body.pgDatabase === "string")
    current.pgDatabase = body.pgDatabase.trim();
  if (typeof body.pgUser === "string") current.pgUser = body.pgUser.trim();
  if (body.clearPgPassword) current.pgPasswordCiphertext = null;
  else if (typeof body.pgPassword === "string" && body.pgPassword.trim()) {
    current.pgPasswordCiphertext = await encryptSecret(body.pgPassword.trim());
  }
  current.updatedAt = nowIso();
  const normalized = normalizeSettings(current);
  await writeLlmSettings(normalized);
  return normalized;
}

export async function getDecryptedPgPassword(
  settings: LlmSettingsStored
): Promise<string | null> {
  if (!settings.pgPasswordCiphertext) {
    return process.env.DATABASE_PASSWORD?.trim() || null;
  }
  try {
    const v = await decryptSecret(settings.pgPasswordCiphertext);
    return v.trim() || null;
  } catch {
    return process.env.DATABASE_PASSWORD?.trim() || null;
  }
}
