import { AiExtras } from "./ai";
import { stripHtml } from "./sanitize";
import { DEFAULT_BASE_URLS, DEFAULT_MODELS } from "./llm-defaults";
import { getDecryptedApiKey, readLlmSettings } from "./llm-store";
import { LlmProvider, StoreData } from "./types";

export type LlmResolved = {
  enabled: boolean;
  provider: LlmProvider;
  model: string;
  baseUrl: string;
  apiKey: string | null;
};

/**
 * Resolve effective LLM config. Never logs keys.
 * Env LLM_ENABLED=true can force enable; keys from encrypted settings or env.
 */
export async function resolveLlmConfig(): Promise<LlmResolved> {
  const settings = await readLlmSettings();
  const envForce =
    process.env.LLM_ENABLED === "1" ||
    process.env.LLM_ENABLED === "true";
  const enabled = settings.enabled || envForce;

  let provider = settings.provider;
  const envProvider = process.env.LLM_PROVIDER?.trim().toLowerCase();
  if (
    envProvider &&
    ["openai", "gemini", "claude", "openrouter", "ollama"].includes(envProvider)
  ) {
    if (!settings.enabled && envForce) {
      provider = envProvider as LlmProvider;
    }
  }

  const model =
    process.env.LLM_MODEL?.trim() ||
    settings.model ||
    DEFAULT_MODELS[provider];

  const baseUrl =
    settings.baseUrl.trim() ||
    process.env.LLM_BASE_URL?.trim() ||
    DEFAULT_BASE_URLS[provider];

  const apiKey = enabled ? await getDecryptedApiKey({ ...settings, provider }) : null;

  return { enabled, provider, model, baseUrl, apiKey };
}

/** Compact workspace snapshot for the model — never includes secret values. */
export function buildCompactContext(
  store: StoreData,
  extras: AiExtras = {}
): string {
  const assets = extras.assets || [];
  const secrets = extras.secrets || [];
  const projects = extras.projects || [];
  const clients = extras.clients || [];
  const subscriptions = extras.subscriptions || [];
  const recurrings = extras.recurrings || [];
  const finance = extras.finance || [];
  const belongings = extras.belongings || [];
  const calendarEvents = extras.calendarEvents || [];
  const jobs = extras.jobs || [];
  const skills = extras.skills || [];
  const library = extras.library || [];

  const lines: string[] = [
    `User: ${store.profile.name}`,
    `Counts — notes:${store.notes.length} tasks:${store.tasks.length} (open ${store.tasks.filter((t) => !t.done).length}) meetings:${store.meetings.length} thoughts:${store.thoughts.length} memories:${store.memories.length} assets:${assets.length} secrets:${secrets.length} projects:${projects.length} clients:${clients.length} subs:${subscriptions.length} recurrings:${recurrings.length} finance:${finance.length} belongings:${belongings.length} calendar:${calendarEvents.length} jobs:${jobs.length} skills:${skills.length} library:${library.length}`,
  ];

  const take = <T,>(arr: T[], n: number) => arr.slice(0, n);

  if (store.notes.length) {
    lines.push(
      "Notes: " +
        take(store.notes, 8)
          .map((n) => `${n.title} (${stripHtml(n.content).slice(0, 80)})`)
          .join(" | ")
    );
  }
  const openTasks = store.tasks.filter((t) => !t.done);
  if (openTasks.length) {
    lines.push(
      "Open tasks: " + take(openTasks, 10).map((t) => t.title).join(" | ")
    );
  }
  if (store.meetings.length) {
    lines.push(
      "Meetings: " +
        take(store.meetings, 5)
          .map((m) => `${m.title} @ ${m.date}`)
          .join(" | ")
    );
  }
  if (projects.length) {
    lines.push(
      "Projects: " +
        take(projects, 8)
          .map((p) => `${p.name} (${p.status})`)
          .join(" | ")
    );
  }
  if (clients.length) {
    lines.push(
      "Clients: " + take(clients, 8).map((c) => c.name).join(" | ")
    );
  }
  if (subscriptions.length) {
    lines.push(
      "Client subscriptions: " +
        take(subscriptions, 6)
          .map((s) => `${s.plan} renews ${s.renewalDate || "—"}`)
          .join(" | ")
    );
  }
  if (recurrings.length) {
    lines.push(
      "Recurrings: " +
        take(recurrings, 8)
          .map((r) => `${r.name} due ${r.nextDueDate || "—"} (${r.status})`)
          .join(" | ")
    );
  }
  if (finance.length) {
    const open = finance.filter(
      (t) =>
        (t.type === "lend" || t.type === "due") && t.status !== "settled"
    );
    lines.push(
      `Finance open lends/dues: ${open.length}; recent: ` +
        take(
          [...finance].sort((a, b) => b.date.localeCompare(a.date)),
          5
        )
          .map((t) => `${t.type} ${t.amount} ${t.currency} ${t.category}`)
          .join(" | ")
    );
  }
  if (belongings.length) {
    lines.push(
      "Belongings: " +
        take(belongings, 8)
          .map((b) => `${b.name} @ ${b.location || "?"} (${b.status})`)
          .join(" | ")
    );
  }
  if (calendarEvents.length) {
    const upcoming = calendarEvents
      .filter((e) => e.status !== "cancelled")
      .sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
      );
    lines.push(
      "Calendar: " +
        take(upcoming, 6)
          .map((e) => `${e.title} ${e.start} (${e.type})`)
          .join(" | ")
    );
  }
  if (jobs.length) {
    lines.push(
      "Jobs: " +
        take(jobs, 8)
          .map((j) => `${j.company} — ${j.role} [${j.status}]`)
          .join(" | ")
    );
  }
  if (skills.length) {
    lines.push(
      "Skills: " +
        take(skills, 12)
          .map((s) => `${s.name}(${s.status})`)
          .join(" | ")
    );
  }
  if (library.length) {
    lines.push(
      "Library: " +
        take(library, 8)
          .map((i) => `${i.title} (${i.type})`)
          .join(" | ")
    );
  }
  if (assets.length) {
    lines.push(
      "Assets: " +
        take(assets, 6)
          .map((a) => `${a.name} (${a.status})`)
          .join(" | ")
    );
  }
  // Secrets: names/categories only — never values
  if (secrets.length) {
    lines.push(
      "Secrets (names only, no values): " +
        take(secrets, 10)
          .map((s) => `${s.name} [${s.category}]`)
          .join(" | ")
    );
  }

  const text = lines.join("\n");
  // Hard cap context size
  return text.length > 12000 ? text.slice(0, 12000) + "\n…" : text;
}

const SYSTEM_PROMPT = `You are the Thinking space assistant for Bi-Polar, a personal workspace app.
Answer helpfully and concisely using the workspace context provided.
Rules:
- Never invent secret values, passwords, or API keys. Secrets are listed by name only; tell the user to open Secrets in the app to reveal values.
- Prefer concrete references to items in the context (notes, tasks, jobs, etc.).
- If context is insufficient, say what you know and suggest which section to check.
- Use plain text with light markdown (**bold**, lists). No HTML.`;

export type LlmCallResult =
  | { ok: true; text: string; provider: LlmProvider; model: string }
  | { ok: false; error: string };

async function chatCompletionsStyle(
  url: string,
  apiKey: string | null,
  model: string,
  system: string,
  user: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...extraHeaders,
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      temperature: 0.4,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    // Never echo API keys if they somehow appear
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty model response");
  return content;
}

async function callOpenAiCompatible(
  baseUrl: string,
  apiKey: string | null,
  model: string,
  system: string,
  user: string,
  extraHeaders: Record<string, string> = {}
): Promise<string> {
  const root = baseUrl.replace(/\/$/, "");
  const url =
    /\/v1$/i.test(root) || /\/api\/v1$/i.test(root)
      ? `${root}/chat/completions`
      : `${root}/v1/chat/completions`;
  return chatCompletionsStyle(url, apiKey, model, system, user, extraHeaders);
}

async function callClaude(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const root = baseUrl.replace(/\/$/, "");
  const res = await fetch(`${root}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text?.trim();
  if (!text) throw new Error("Empty Claude response");
  return text;
}

async function callGemini(
  baseUrl: string,
  apiKey: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const root = baseUrl.replace(/\/$/, "");
  const url = `${root}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Empty Gemini response");
  return text;
}

async function callOllama(
  baseUrl: string,
  model: string,
  system: string,
  user: string
): Promise<string> {
  const root = baseUrl.replace(/\/$/, "");
  // Prefer OpenAI-compatible endpoint when available
  try {
    return await callOpenAiCompatible(
      `${root}/v1`,
      null,
      model,
      system,
      user
    );
  } catch {
    const res = await fetch(`${root}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      message?: { content?: string };
    };
    const text = data.message?.content?.trim();
    if (!text) throw new Error("Empty Ollama response");
    return text;
  }
}

export async function callLlm(opts: {
  message: string;
  context: string;
  config: LlmResolved;
}): Promise<LlmCallResult> {
  const { message, context, config } = opts;
  if (!config.enabled) {
    return { ok: false, error: "LLM disabled" };
  }

  const needsKey = config.provider !== "ollama";
  if (needsKey && !config.apiKey) {
    return { ok: false, error: "No API key configured" };
  }

  const userContent = `Workspace context:\n${context}\n\nUser question:\n${message}`;

  try {
    let text: string;
    switch (config.provider) {
      case "openai":
        text = await callOpenAiCompatible(
          config.baseUrl,
          config.apiKey,
          config.model,
          SYSTEM_PROMPT,
          userContent
        );
        break;
      case "openrouter":
        text = await callOpenAiCompatible(
          config.baseUrl,
          config.apiKey,
          config.model,
          SYSTEM_PROMPT,
          userContent,
          {
            "HTTP-Referer": "https://second-brain.local",
            "X-Title": "Bi-Polar",
          }
        );
        break;
      case "claude":
        if (!config.apiKey) return { ok: false, error: "No API key configured" };
        text = await callClaude(
          config.baseUrl,
          config.apiKey,
          config.model,
          SYSTEM_PROMPT,
          userContent
        );
        break;
      case "gemini":
        if (!config.apiKey) return { ok: false, error: "No API key configured" };
        text = await callGemini(
          config.baseUrl,
          config.apiKey,
          config.model,
          SYSTEM_PROMPT,
          userContent
        );
        break;
      case "ollama":
        text = await callOllama(
          config.baseUrl,
          config.model,
          SYSTEM_PROMPT,
          userContent
        );
        break;
      default:
        return { ok: false, error: "Unknown provider" };
    }
    return {
      ok: true,
      text,
      provider: config.provider,
      model: config.model,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "LLM request failed";
    // Strip anything that looks like a bearer token from error text
    const safe = msg.replace(/Bearer\s+\S+/gi, "Bearer ***").replace(/key=[^&\s]+/gi, "key=***");
    return { ok: false, error: safe };
  }
}
