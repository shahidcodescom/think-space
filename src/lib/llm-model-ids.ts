import { DEFAULT_MODELS } from "./llm-defaults";
import { LlmProvider } from "./types";

/** Strip Gemini resource prefix `models/` for generateContent paths. */
export function normalizeGeminiModelId(model: string): string {
  const trimmed = model.trim();
  return trimmed.replace(/^models\//i, "");
}

/** Gemini 2.0 Flash family was shut down — map to current default. */
const SHUTDOWN_GEMINI_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.0-flash-001",
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash-lite-001",
  "models/gemini-2.0-flash",
  "models/gemini-2.0-flash-001",
  "models/gemini-2.0-flash-lite",
  "models/gemini-2.0-flash-lite-001",
]);

export function migrateStaleModelId(
  provider: LlmProvider,
  model: string
): string {
  const m = model.trim();
  if (!m) return DEFAULT_MODELS[provider];
  if (provider === "gemini" && SHUTDOWN_GEMINI_MODELS.has(m)) {
    return DEFAULT_MODELS.gemini;
  }
  if (provider === "gemini") return normalizeGeminiModelId(m);
  return m;
}
