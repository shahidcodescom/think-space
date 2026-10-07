import { encryptSecret, decryptSecret } from "./crypto";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";
import { DEFAULT_MODELS } from "./llm-defaults";
import { migrateStaleModelId } from "./llm-model-ids";
import { RAG_MODULE_IDS } from "./rag-modules";
import { nowIso } from "./store";
import { LlmProvider, LlmSettingsPublic, LlmSettingsStored } from "./types";

export { DEFAULT_BASE_URLS, DEFAULT_MODELS } from "./llm-defaults";

const KEY = "llm-settings";

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
  chatMemoryTurns: 5,
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
    chatMemoryTurns: clamp(
      Number(parsed.chatMemoryTurns),
      0,
      50,
      DEFAULT_LLM_SETTINGS.chatMemoryTurns
    ),
    updatedAt: parsed.updatedAt || DEFAULT_LLM_SETTINGS.updatedAt,
  };
}

export async function readLlmSettings(): Promise<LlmSettingsStored> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<Partial<LlmSettingsStored>>(
      "llm-settings.json"
    );
    if (legacy) return normalizeSettings(legacy);
    return { ...DEFAULT_LLM_SETTINGS, ragModules: [...RAG_MODULE_IDS] };
  }).then((parsed) => normalizeSettings(parsed));
}

export async function writeLlmSettings(
  data: LlmSettingsStored
): Promise<void> {
  await setDoc(KEY, normalizeSettings(data));
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
    chatMemoryTurns: n.chatMemoryTurns,
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
  chatMemoryTurns?: number;
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
  if (body.chatMemoryTurns !== undefined)
    current.chatMemoryTurns = body.chatMemoryTurns;
  current.updatedAt = nowIso();
  const normalized = normalizeSettings(current);
  await writeLlmSettings(normalized);
  return normalized;
}

