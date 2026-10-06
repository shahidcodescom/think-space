import { LlmProvider } from "./types";

export const LLM_PROVIDERS: LlmProvider[] = [
  "openai",
  "gemini",
  "claude",
  "openrouter",
  "ollama",
];

export const DEFAULT_MODELS: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  gemini: "gemini-2.0-flash",
  claude: "claude-3-5-haiku-latest",
  openrouter: "openai/gpt-4o-mini",
  ollama: "llama3.2",
};

export const DEFAULT_BASE_URLS: Record<LlmProvider, string> = {
  openai: "https://api.openai.com/v1",
  gemini: "https://generativelanguage.googleapis.com/v1beta",
  claude: "https://api.anthropic.com",
  openrouter: "https://openrouter.ai/api/v1",
  ollama: "http://127.0.0.1:11434",
};

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  openai: "OpenAI",
  gemini: "Google Gemini",
  claude: "Claude (Anthropic)",
  openrouter: "OpenRouter",
  ollama: "Ollama (local)",
};
