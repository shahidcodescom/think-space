import { DEFAULT_BASE_URLS, DEFAULT_MODELS } from "./llm-defaults";
import {
  migrateStaleModelId,
  normalizeGeminiModelId,
} from "./llm-model-ids";
import { getDecryptedApiKey, readLlmSettings } from "./llm-store";
import { LlmProvider } from "./types";

export { migrateStaleModelId, normalizeGeminiModelId } from "./llm-model-ids";

export type LlmModelOption = {
  id: string;
  label: string;
};

function openaiCompatibleRoot(baseUrl: string): string {
  const root = baseUrl.replace(/\/$/, "");
  if (/\/v1$/i.test(root) || /\/api\/v1$/i.test(root)) return root;
  return `${root}/v1`;
}

async function listGeminiModels(
  baseUrl: string,
  apiKey: string
): Promise<LlmModelOption[]> {
  const root = baseUrl.replace(/\/$/, "");
  const models: LlmModelOption[] = [];
  let pageToken = "";
  for (let page = 0; page < 10; page++) {
    const qs = new URLSearchParams({ pageSize: "100" });
    if (pageToken) qs.set("pageToken", pageToken);
    const res = await fetch(`${root}/models?${qs}`, {
      headers: { "x-goog-api-key": apiKey },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`Gemini models.list HTTP ${res.status}: ${errText.slice(0, 180)}`);
    }
    const data = (await res.json()) as {
      models?: {
        name?: string;
        displayName?: string;
        supportedGenerationMethods?: string[];
        supportedActions?: string[];
      }[];
      nextPageToken?: string;
    };
    for (const m of data.models || []) {
      const methods = m.supportedGenerationMethods || m.supportedActions || [];
      if (methods.length && !methods.includes("generateContent")) continue;
      const id = normalizeGeminiModelId(m.name || "");
      if (!id) continue;
      // Skip pure embedding / image-only noise when methods were empty we already kept;
      // prefer chat-capable naming.
      if (/embedding|imagen|veo|lyria|tts|live|transcribe|robotics|nano-banana|image/i.test(id)) {
        continue;
      }
      models.push({
        id,
        label: m.displayName ? `${m.displayName} (${id})` : id,
      });
    }
    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

async function listOpenAiStyleModels(
  baseUrl: string,
  apiKey: string | null,
  extraHeaders: Record<string, string> = {}
): Promise<LlmModelOption[]> {
  const root = openaiCompatibleRoot(baseUrl);
  const headers: Record<string, string> = { ...extraHeaders };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  const res = await fetch(`${root}/models`, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Models HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    data?: { id?: string; name?: string }[];
  };
  const models = (data.data || [])
    .map((m) => {
      const id = (m.id || m.name || "").trim();
      return id ? { id, label: id } : null;
    })
    .filter((m): m is LlmModelOption => Boolean(m));
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

async function listClaudeModels(
  baseUrl: string,
  apiKey: string
): Promise<LlmModelOption[]> {
  const root = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${root}/v1/models`, {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Claude models HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    data?: { id?: string; display_name?: string }[];
  };
  const models = (data.data || [])
    .map((m) => {
      const id = (m.id || "").trim();
      if (!id) return null;
      return {
        id,
        label: m.display_name ? `${m.display_name} (${id})` : id,
      };
    })
    .filter((m): m is LlmModelOption => Boolean(m));
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

async function listOllamaModels(baseUrl: string): Promise<LlmModelOption[]> {
  const root = baseUrl.replace(/\/$/, "").replace(/\/v1$/i, "");
  const res = await fetch(`${root}/api/tags`);
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Ollama tags HTTP ${res.status}: ${errText.slice(0, 180)}`);
  }
  const data = (await res.json()) as {
    models?: { name?: string; model?: string }[];
  };
  const models = (data.models || [])
    .map((m) => {
      const id = (m.name || m.model || "").trim();
      return id ? { id, label: id } : null;
    })
    .filter((m): m is LlmModelOption => Boolean(m));
  models.sort((a, b) => a.id.localeCompare(b.id));
  return models;
}

export async function listProviderModels(opts?: {
  provider?: LlmProvider;
  baseUrl?: string;
}): Promise<{
  provider: LlmProvider;
  models: LlmModelOption[];
  defaultModel: string;
  error?: string;
}> {
  const settings = await readLlmSettings();
  const provider = opts?.provider || settings.provider;
  const baseUrl =
    (opts?.baseUrl !== undefined ? opts.baseUrl : settings.baseUrl).trim() ||
    DEFAULT_BASE_URLS[provider];
  const apiKey = await getDecryptedApiKey({ ...settings, provider });
  const defaultModel = migrateStaleModelId(
    provider,
    settings.provider === provider ? settings.model : DEFAULT_MODELS[provider]
  );

  try {
    let models: LlmModelOption[] = [];
    switch (provider) {
      case "gemini": {
        if (!apiKey) throw new Error("No API key configured");
        models = await listGeminiModels(baseUrl, apiKey);
        break;
      }
      case "openai": {
        if (!apiKey) throw new Error("No API key configured");
        models = await listOpenAiStyleModels(baseUrl, apiKey);
        break;
      }
      case "openrouter": {
        if (!apiKey) throw new Error("No API key configured");
        models = await listOpenAiStyleModels(baseUrl, apiKey, {
          "HTTP-Referer": "https://second-brain.local",
          "X-Title": "Bi-Polar",
        });
        break;
      }
      case "claude": {
        if (!apiKey) throw new Error("No API key configured");
        models = await listClaudeModels(baseUrl, apiKey);
        break;
      }
      case "ollama": {
        models = await listOllamaModels(baseUrl);
        break;
      }
      default:
        throw new Error("Unknown provider");
    }

    if (!models.length) {
      models = [{ id: defaultModel, label: defaultModel }];
    }

    return { provider, models, defaultModel };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to list models";
    const safe = msg
      .replace(/Bearer\s+\S+/gi, "Bearer ***")
      .replace(/key=[^&\s]+/gi, "key=***")
      .replace(/x-goog-api-key["\s:]+[^\s"]+/gi, "x-goog-api-key:***");
    return {
      provider,
      models: [{ id: defaultModel, label: `${defaultModel} (default)` }],
      defaultModel,
      error: safe.slice(0, 240),
    };
  }
}
