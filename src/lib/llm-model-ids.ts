import { DEFAULT_MODELS } from "./llm-defaults";
import { LlmProvider } from "./types";

/** Strip Gemini resource prefix `models/` for generateContent paths. */
export function normalizeGeminiModelId(model: string): string {
  const trimmed = model.trim();
  return trimmed.replace(/^models\//i, "");
}

/**
 * Non-existent or retired Gemini IDs we have shipped / users may still have saved.
 * Map all of these to the current DEFAULT_MODELS.gemini.
 */
const STALE_GEMINI_MODELS = new Set([
  // Invented / never existed
  "gemini-3.8-flash",
  "gemini-3.8-flash-lite",
  "models/gemini-3.8-flash",
  "models/gemini-3.8-flash-lite",
  // Retired 2.0 Flash family
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
  if (provider === "gemini") {
    const id = normalizeGeminiModelId(m);
    if (STALE_GEMINI_MODELS.has(m) || STALE_GEMINI_MODELS.has(id)) {
      return DEFAULT_MODELS.gemini;
    }
    return id;
  }
  return m;
}

/**
 * Prefer a generateContent flash model from a live list.
 * Order: exact default → *-flash (non-lite/pro/exp noise last) → first id.
 */
export function preferGeminiFlashModel(
  modelIds: string[],
  preferred: string = DEFAULT_MODELS.gemini
): string {
  const ids = modelIds.map(normalizeGeminiModelId).filter(Boolean);
  if (!ids.length) return preferred;
  if (ids.includes(preferred)) return preferred;
  const flash = ids.find(
    (id) =>
      /flash/i.test(id) &&
      !/lite|exp|preview|tts|live|image|embed/i.test(id)
  );
  if (flash) return flash;
  const anyFlash = ids.find((id) => /flash/i.test(id));
  if (anyFlash) return anyFlash;
  return ids[0];
}
