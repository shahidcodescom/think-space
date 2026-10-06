"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import {
  DEFAULT_MODELS,
  LLM_PROVIDERS,
  PROVIDER_LABELS,
} from "@/lib/llm-defaults";
import { RAG_MODULE_IDS } from "@/lib/rag-modules";
import {
  IntentAction,
  IntentDef,
  LlmProvider,
  LlmSettingsPublic,
} from "@/lib/types";

type ActionOpt = { value: IntentAction; label: string; query: string };

export function LlmSettingsPanel() {
  const [llm, setLlm] = useState<LlmSettingsPublic | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [pgPasswordDraft, setPgPasswordDraft] = useState("");
  const [llmSaved, setLlmSaved] = useState(false);
  const [llmBusy, setLlmBusy] = useState(false);
  const [modelOptions, setModelOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [pgMsg, setPgMsg] = useState<string | null>(null);
  const [intents, setIntents] = useState<IntentDef[]>([]);
  const [actions, setActions] = useState<ActionOpt[]>([]);
  const [intentForm, setIntentForm] = useState({
    id: "",
    name: "",
    action: "list_notes" as IntentAction,
    patterns: "",
    enabled: true,
  });

  const loadModels = useCallback(
    async (provider: LlmProvider, baseUrl: string, preferModel?: string) => {
      setModelsLoading(true);
      setModelsError(null);
      try {
        const qs = new URLSearchParams({ provider });
        if (baseUrl.trim()) qs.set("baseUrl", baseUrl.trim());
        const res = await fetch(`/api/llm/models?${qs}`);
        const data = (await res.json()) as {
          models?: { id: string; label: string }[];
          defaultModel?: string;
          error?: string;
        };
        const opts = (data.models || []).map((m) => ({
          value: m.id,
          label: m.label,
        }));
        setModelOptions(opts);
        if (data.error) setModelsError(data.error);
        const stale =
          provider === "gemini" &&
          preferModel &&
          /^(models\/)?gemini-(3\.8|2\.0)-flash/i.test(preferModel);
        const pick =
          (!stale &&
          preferModel &&
          opts.some((o) => o.value === preferModel)
            ? preferModel
            : null) ||
          data.defaultModel ||
          opts[0]?.value ||
          DEFAULT_MODELS[provider];
        setLlm((prev) =>
          prev && prev.provider === provider ? { ...prev, model: pick } : prev
        );
      } catch {
        setModelsError("Could not load models");
      } finally {
        setModelsLoading(false);
      }
    },
    []
  );

  const loadIntents = useCallback(async () => {
    const res = await fetch("/api/intents");
    const data = await res.json();
    setIntents(data.intents || []);
    setActions(data.actions || []);
  }, []);

  useEffect(() => {
    fetch("/api/llm/settings")
      .then((r) => r.json())
      .then((settings: LlmSettingsPublic) => {
        setLlm(settings);
        void loadModels(settings.provider, settings.baseUrl, settings.model);
      })
      .catch(() => setLlm(null));
    void loadIntents();
  }, [loadModels, loadIntents]);

  async function saveLlm(e: FormEvent) {
    e.preventDefault();
    if (!llm) return;
    setLlmBusy(true);
    const body: Record<string, unknown> = {
      enabled: llm.enabled,
      provider: llm.provider,
      model: llm.model,
      baseUrl: llm.baseUrl,
      temperature: llm.temperature,
      maxTokens: llm.maxTokens,
      systemPrompt: llm.systemPrompt,
      ragEnabled: llm.ragEnabled,
      ragTopK: llm.ragTopK,
      ragChunkSize: llm.ragChunkSize,
      contextCharLimit: llm.contextCharLimit,
      ragModules: llm.ragModules,
      pgEnabled: llm.pgEnabled,
      pgConnectionString: llm.pgConnectionString,
      pgHost: llm.pgHost,
      pgPort: llm.pgPort,
      pgDatabase: llm.pgDatabase,
      pgUser: llm.pgUser,
    };
    if (apiKeyDraft.trim()) body.apiKey = apiKeyDraft.trim();
    if (pgPasswordDraft.trim()) body.pgPassword = pgPasswordDraft.trim();
    const res = await fetch("/api/llm/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const saved = (await res.json()) as LlmSettingsPublic;
    setLlm(saved);
    setApiKeyDraft("");
    setPgPasswordDraft("");
    setLlmBusy(false);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 2000);
    await loadModels(saved.provider, saved.baseUrl, saved.model);
  }

  async function pgAction(action: "test" | "migrate" | "reindex") {
    setPgMsg("Working…");
    const res = await fetch("/api/llm/pgvector", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    setPgMsg(data.message || (data.ok ? "OK" : "Failed"));
  }

  async function saveIntent(e: FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/intents", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: intentForm.id || undefined,
        name: intentForm.name,
        action: intentForm.action,
        patterns: intentForm.patterns.split("\n").map((s) => s.trim()).filter(Boolean),
        enabled: intentForm.enabled,
      }),
    });
    if (res.ok) {
      setIntentForm({
        id: "",
        name: "",
        action: "list_notes",
        patterns: "",
        enabled: true,
      });
      await loadIntents();
    }
  }

  if (!llm) {
    return <p className="text-sm text-forest/50">Loading LLM settings…</p>;
  }

  return (
    <div className="space-y-4">
      <form onSubmit={saveLlm} className="card p-5 space-y-4">
        <div>
          <h2 className="font-serif text-lg text-forest">Thinking space LLM</h2>
          <p className="text-xs text-forest/50 mt-1">
            Provider, model, sampling, system prompt, RAG, and Postgres/pgvector.
            Secret values are never sent to the model.
          </p>
        </div>

        <ToggleSwitch
          checked={llm.enabled}
          onChange={(enabled) => setLlm({ ...llm, enabled })}
          label="Enable LLM for Thinking space"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Provider
            </label>
            <SearchableSelect
              options={LLM_PROVIDERS.map((p) => ({
                value: p,
                label: PROVIDER_LABELS[p],
              }))}
              value={llm.provider}
              onChange={(provider) => {
                const next = provider as LlmProvider;
                const nextLlm = {
                  ...llm,
                  provider: next,
                  model: DEFAULT_MODELS[next],
                };
                setLlm(nextLlm);
                void loadModels(next, nextLlm.baseUrl, nextLlm.model);
              }}
              aria-label="Provider"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Model
            </label>
            <SearchableSelect
              options={
                modelOptions.length
                  ? modelOptions
                  : [
                      {
                        value: llm.model || DEFAULT_MODELS[llm.provider],
                        label: llm.model || DEFAULT_MODELS[llm.provider],
                      },
                    ]
              }
              value={llm.model || DEFAULT_MODELS[llm.provider]}
              onChange={(model) => setLlm({ ...llm, model })}
              placeholder={modelsLoading ? "Loading…" : DEFAULT_MODELS[llm.provider]}
              aria-label="Model"
              required
            />
            <p className="mt-1 text-xs text-forest/45">
              {modelsLoading
                ? "Fetching models…"
                : modelsError
                  ? modelsError
                  : `${modelOptions.length} live models`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Temperature ({llm.temperature})
            </label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              className="w-full accent-forest"
              value={llm.temperature}
              onChange={(e) =>
                setLlm({ ...llm, temperature: Number(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Max tokens
            </label>
            <input
              type="number"
              className="input-field"
              min={64}
              max={8192}
              value={llm.maxTokens}
              onChange={(e) =>
                setLlm({ ...llm, maxTokens: Number(e.target.value) || 1024 })
              }
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            System prompt override
          </label>
          <textarea
            className="input-field min-h-[88px]"
            placeholder="Leave blank for Bi-Polar default (includes Open links guidance)"
            value={llm.systemPrompt}
            onChange={(e) => setLlm({ ...llm, systemPrompt: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Base URL
          </label>
          <input
            className="input-field"
            value={llm.baseUrl}
            onChange={(e) => setLlm({ ...llm, baseUrl: e.target.value })}
            placeholder="Leave blank for provider default"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            API key
          </label>
          <input
            className="input-field"
            type="password"
            autoComplete="off"
            value={apiKeyDraft}
            onChange={(e) => setApiKeyDraft(e.target.value)}
            placeholder={
              llm.hasApiKey
                ? "•••• saved — paste to replace"
                : llm.envKeyAvailable
                  ? "Env key available — or paste to store"
                  : "Paste key (encrypted at rest)"
            }
          />
        </div>

        <div className="border-t border-forest/10 pt-4 space-y-3">
          <h3 className="font-serif text-base text-forest">RAG</h3>
          <ToggleSwitch
            checked={llm.ragEnabled}
            onChange={(ragEnabled) => setLlm({ ...llm, ragEnabled })}
            label="Enable retrieval-augmented context"
          />
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Top-k
              </label>
              <input
                type="number"
                className="input-field"
                min={1}
                max={40}
                value={llm.ragTopK}
                onChange={(e) =>
                  setLlm({ ...llm, ragTopK: Number(e.target.value) || 8 })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Chunk size
              </label>
              <input
                type="number"
                className="input-field"
                min={80}
                max={2000}
                value={llm.ragChunkSize}
                onChange={(e) =>
                  setLlm({ ...llm, ragChunkSize: Number(e.target.value) || 280 })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Context cap
              </label>
              <input
                type="number"
                className="input-field"
                min={1000}
                max={100000}
                value={llm.contextCharLimit}
                onChange={(e) =>
                  setLlm({
                    ...llm,
                    contextCharLimit: Number(e.target.value) || 12000,
                  })
                }
              />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-2">
              Retrieve from modules
            </p>
            <div className="flex flex-wrap gap-2">
              {RAG_MODULE_IDS.map((mod) => {
                const on = llm.ragModules?.includes(mod);
                return (
                  <button
                    key={mod}
                    type="button"
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition ${
                      on
                        ? "bg-sage-muted border-sage text-forest"
                        : "bg-white border-forest/10 text-forest/50"
                    }`}
                    onClick={() => {
                      const set = new Set(llm.ragModules || []);
                      if (set.has(mod)) set.delete(mod);
                      else set.add(mod);
                      setLlm({ ...llm, ragModules: [...set] });
                    }}
                  >
                    {mod}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="border-t border-forest/10 pt-4 space-y-3">
          <h3 className="font-serif text-base text-forest">
            PostgreSQL + pgvector
          </h3>
          <p className="text-xs text-forest/50">
            Optional production RAG store. Falls back to in-memory keyword RAG when
            unset or unreachable. CRUD data stays on JSON.
          </p>
          <ToggleSwitch
            checked={llm.pgEnabled}
            onChange={(pgEnabled) => setLlm({ ...llm, pgEnabled })}
            label="Use Postgres/pgvector for RAG"
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Connection string
            </label>
            <input
              className="input-field"
              value={llm.pgConnectionString}
              onChange={(e) =>
                setLlm({ ...llm, pgConnectionString: e.target.value })
              }
              placeholder="postgres://user:pass@host:5432/bipolar"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Host
              </label>
              <input
                className="input-field"
                value={llm.pgHost}
                onChange={(e) => setLlm({ ...llm, pgHost: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Port
              </label>
              <input
                type="number"
                className="input-field"
                value={llm.pgPort}
                onChange={(e) =>
                  setLlm({ ...llm, pgPort: Number(e.target.value) || 5432 })
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Database
              </label>
              <input
                className="input-field"
                value={llm.pgDatabase}
                onChange={(e) => setLlm({ ...llm, pgDatabase: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                User
              </label>
              <input
                className="input-field"
                value={llm.pgUser}
                onChange={(e) => setLlm({ ...llm, pgUser: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              Password
            </label>
            <input
              type="password"
              className="input-field"
              autoComplete="off"
              value={pgPasswordDraft}
              onChange={(e) => setPgPasswordDraft(e.target.value)}
              placeholder={
                llm.hasPgPassword
                  ? "•••• saved — paste to replace"
                  : "Optional if in connection string / env"
              }
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost text-sm" onClick={() => pgAction("test")}>
              Test connection
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => pgAction("migrate")}>
              Run migrations
            </button>
            <button type="button" className="btn-ghost text-sm" onClick={() => pgAction("reindex")}>
              Reindex embeddings
            </button>
          </div>
          {pgMsg && <p className="text-xs text-forest/60">{pgMsg}</p>}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button type="submit" className="btn-primary" disabled={llmBusy}>
            {llmBusy ? "Saving…" : "Save LLM & RAG settings"}
          </button>
          {llmSaved && <span className="text-sm text-sage-dark">Saved</span>}
        </div>
      </form>

      <div className="card p-5 space-y-4">
        <div>
          <h2 className="font-serif text-lg text-forest">Intents</h2>
          <p className="text-xs text-forest/50 mt-1">
            Train rule-based patterns for Thinking space. Enabled intents rewrite
            matching phrases to a built-in action before rules/LLM run.
          </p>
        </div>

        <ul className="space-y-2">
          {intents.map((intent) => (
            <li
              key={intent.id}
              className="rounded-xl border border-forest/10 bg-cream-soft/60 px-3 py-2.5 flex flex-wrap items-center gap-2 justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-forest">{intent.name}</p>
                <p className="text-xs text-forest/45 truncate">
                  {intent.action} · {intent.patterns.join(" | ")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ToggleSwitch
                  checked={intent.enabled}
                  onChange={async (enabled) => {
                    await fetch("/api/intents", {
                      method: "PUT",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        id: intent.id,
                        enabled,
                        toggleOnly: true,
                      }),
                    });
                    await loadIntents();
                  }}
                  label={intent.enabled ? "On" : "Off"}
                  className="text-xs"
                />
                <button
                  type="button"
                  className="btn-ghost text-xs px-2"
                  onClick={() =>
                    setIntentForm({
                      id: intent.id,
                      name: intent.name,
                      action: intent.action,
                      patterns: intent.patterns.join("\n"),
                      enabled: intent.enabled,
                    })
                  }
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-ghost text-xs px-2 text-red-700"
                  onClick={async () => {
                    await fetch(`/api/intents?id=${encodeURIComponent(intent.id)}`, {
                      method: "DELETE",
                    });
                    await loadIntents();
                  }}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={saveIntent} className="space-y-3 border-t border-forest/10 pt-4">
          <p className="text-sm font-medium text-forest">
            {intentForm.id ? "Edit intent" : "Add / train intent"}
          </p>
          <input
            className="input-field"
            placeholder="Name"
            value={intentForm.name}
            onChange={(e) => setIntentForm({ ...intentForm, name: e.target.value })}
            required
          />
          <SearchableSelect
            options={actions.map((a) => ({ value: a.value, label: a.label }))}
            value={intentForm.action}
            onChange={(action) =>
              setIntentForm({ ...intentForm, action: action as IntentAction })
            }
            aria-label="Intent action"
            required
          />
          <textarea
            className="input-field min-h-[80px]"
            placeholder={"One regex pattern per line\ne.g. list.*notes"}
            value={intentForm.patterns}
            onChange={(e) =>
              setIntentForm({ ...intentForm, patterns: e.target.value })
            }
            required
          />
          <div className="flex gap-2">
            <button type="submit" className="btn-primary">
              {intentForm.id ? "Update intent" : "Add intent"}
            </button>
            {intentForm.id && (
              <button
                type="button"
                className="btn-ghost"
                onClick={() =>
                  setIntentForm({
                    id: "",
                    name: "",
                    action: "list_notes",
                    patterns: "",
                    enabled: true,
                  })
                }
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
