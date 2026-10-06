import { promises as fs } from "fs";
import path from "path";
import { encryptSecret, decryptSecret } from "./crypto";
import { DEFAULT_MODELS } from "./llm-defaults";
import { nowIso } from "./store";
import { LlmProvider, LlmSettingsPublic, LlmSettingsStored } from "./types";

export { DEFAULT_BASE_URLS, DEFAULT_MODELS } from "./llm-defaults";

const DATA_PATH = path.join(process.cwd(), "data", "llm-settings.json");

const DEFAULT_SETTINGS: LlmSettingsStored = {
  enabled: false,
  provider: "openai",
  model: DEFAULT_MODELS.openai,
  baseUrl: "",
  apiKeyCiphertext: null,
  updatedAt: new Date(0).toISOString(),
};

export async function readLlmSettings(): Promise<LlmSettingsStored> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as Partial<LlmSettingsStored>;
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      enabled: Boolean(parsed.enabled),
      apiKeyCiphertext: parsed.apiKeyCiphertext || null,
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      await writeLlmSettings(DEFAULT_SETTINGS);
      return { ...DEFAULT_SETTINGS };
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
    ollama: ["OLLAMA_API_KEY", "LLM_API_KEY"], // usually unused
  };
  for (const name of map[provider]) {
    const v = process.env[name]?.trim();
    if (v) return v;
  }
  // Generic override when LLM_PROVIDER matches
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
      // fall through to env
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
  return {
    enabled,
    provider: settings.provider,
    model: settings.model || DEFAULT_MODELS[settings.provider],
    baseUrl: settings.baseUrl || "",
    hasApiKey: hasStored,
    envKeyAvailable: envKey,
    source,
  };
}

export async function updateLlmSettings(body: {
  enabled?: boolean;
  provider?: LlmProvider;
  model?: string;
  baseUrl?: string;
  apiKey?: string | null;
  clearApiKey?: boolean;
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
    if (!body.model) {
      current.model = DEFAULT_MODELS[body.provider];
    }
  }
  if (typeof body.model === "string" && body.model.trim()) {
    current.model = body.model.trim();
  }
  if (typeof body.baseUrl === "string") {
    current.baseUrl = body.baseUrl.trim();
  }
  if (body.clearApiKey) {
    current.apiKeyCiphertext = null;
  } else if (typeof body.apiKey === "string") {
    const trimmed = body.apiKey.trim();
    if (trimmed) {
      current.apiKeyCiphertext = await encryptSecret(trimmed);
    }
  }
  current.updatedAt = nowIso();
  await writeLlmSettings(current);
  return current;
}
