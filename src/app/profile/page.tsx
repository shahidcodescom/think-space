"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "@/components/Icons";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  DEFAULT_MODELS,
  LLM_PROVIDERS,
  PROVIDER_LABELS,
} from "@/lib/llm-defaults";
import { LlmProvider, LlmSettingsPublic, Profile } from "@/lib/types";

type VaultStatus = { configured: boolean; source: string; hint: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [llm, setLlm] = useState<LlmSettingsPublic | null>(null);
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [llmSaved, setLlmSaved] = useState(false);
  const [llmBusy, setLlmBusy] = useState(false);
  const [modelOptions, setModelOptions] = useState<{ value: string; label: string }[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile);
    fetch("/api/secrets/status")
      .then((r) => r.json())
      .then(setVault)
      .catch(() => setVault(null));
    fetch("/api/llm/settings")
      .then((r) => r.json())
      .then((settings: LlmSettingsPublic) => {
        setLlm(settings);
        void loadModels(settings.provider, settings.baseUrl, settings.model);
      })
      .catch(() => setLlm(null));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    setProfile(await res.json());
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function loadModels(
    provider: LlmProvider,
    baseUrl: string,
    preferModel?: string
  ) {
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
      const staleGemini =
        provider === "gemini" &&
        preferModel &&
        /^(models\/)?gemini-(3\.8|2\.0)-flash/i.test(preferModel);
      const pick =
        (!staleGemini &&
        preferModel &&
        opts.some((o) => o.value === preferModel)
          ? preferModel
          : null) ||
        data.defaultModel ||
        opts[0]?.value ||
        DEFAULT_MODELS[provider];
      setLlm((prev) =>
        prev && prev.provider === provider
          ? { ...prev, model: pick }
          : prev
      );
    } catch {
      setModelsError("Could not load models");
      setModelOptions([
        {
          value: DEFAULT_MODELS[provider],
          label: `${DEFAULT_MODELS[provider]} (default)`,
        },
      ]);
    } finally {
      setModelsLoading(false);
    }
  }

  async function saveLlm(e: React.FormEvent) {
    e.preventDefault();
    if (!llm) return;
    setLlmBusy(true);
    const body: Record<string, unknown> = {
      enabled: llm.enabled,
      provider: llm.provider,
      model: llm.model,
      baseUrl: llm.baseUrl,
    };
    if (apiKeyDraft.trim()) body.apiKey = apiKeyDraft.trim();
    const res = await fetch("/api/llm/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const savedSettings = (await res.json()) as LlmSettingsPublic;
    setLlm(savedSettings);
    setApiKeyDraft("");
    setLlmBusy(false);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 2000);
    await loadModels(
      savedSettings.provider,
      savedSettings.baseUrl,
      savedSettings.model
    );
  }

  async function clearLlmKey() {
    if (!llm) return;
    setLlmBusy(true);
    const res = await fetch("/api/llm/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clearApiKey: true }),
    });
    setLlm(await res.json());
    setApiKeyDraft("");
    setLlmBusy(false);
  }

  if (!profile) {
    return (
      <div className="page-shell">
        <p className="text-sm text-forest/50">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen max-w-xl">
      <header className="mb-6">
        <h1 className="section-title">Profile.</h1>
        <p className="text-forest/55 mt-1 text-sm">
          Name, voice, language, and optional Thinking-space LLM.
        </p>
      </header>

      <form onSubmit={save} className="card p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Name
          </label>
          <input
            className="input-field"
            value={profile.name}
            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Language
          </label>
          <SearchableSelect
            options={[
              { value: "English (India)", label: "English (India)" },
              { value: "English (US)", label: "English (US)" },
              { value: "English (UK)", label: "English (UK)" },
              { value: "Hindi", label: "Hindi" },
            ]}
            value={profile.language}
            onChange={(language) => setProfile({ ...profile, language })}
            aria-label="Language"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Voice
          </label>
          <SearchableSelect
            options={[
              { value: "Default voice", label: "Default voice" },
              { value: "Calm voice", label: "Calm voice" },
              { value: "Bright voice", label: "Bright voice" },
            ]}
            value={profile.voice}
            onChange={(voice) => setProfile({ ...profile, voice })}
            aria-label="Voice"
            required
          />
        </div>

        <ToggleSwitch
          checked={profile.readAloud}
          onChange={(readAloud) => setProfile({ ...profile, readAloud })}
          label="Read replies aloud in Thinking space"
        />

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" className="btn-primary" disabled={busy}>
            {busy ? "Saving…" : "Save preferences"}
          </button>
          {saved && <span className="text-sm text-sage-dark">Saved</span>}
        </div>
      </form>

      <form onSubmit={saveLlm} className="card p-5 mt-4 space-y-4">
        <div>
          <h2 className="font-serif text-lg text-forest">Thinking space LLM</h2>
          <p className="text-xs text-forest/50 mt-1">
            Optional. Off by default — rule-based answers. When enabled, chat
            uses your provider with compact workspace context (never secret
            values). Falls back to rules if the call fails.
          </p>
        </div>

        {llm ? (
          <>
            <ToggleSwitch
              checked={llm.enabled}
              onChange={(enabled) => setLlm({ ...llm, enabled })}
              label="Enable LLM for Thinking space"
            />

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
                placeholder={
                  modelsLoading
                    ? "Loading models…"
                    : DEFAULT_MODELS[llm.provider]
                }
                aria-label="Model"
                required
              />
              <p className="mt-1 text-xs text-forest/45">
                {modelsLoading
                  ? "Fetching latest models from provider…"
                  : modelsError
                    ? `Could not refresh list: ${modelsError}`
                    : modelOptions.length
                      ? `${modelOptions.length} models from provider`
                      : "Save an API key to load live models"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Base URL{" "}
                <span className="normal-case font-normal">
                  (Ollama / OpenRouter / custom)
                </span>
              </label>
              <input
                className="input-field"
                value={llm.baseUrl}
                onChange={(e) => setLlm({ ...llm, baseUrl: e.target.value })}
                placeholder={
                  llm.provider === "ollama"
                    ? "http://127.0.0.1:11434"
                    : "Leave blank for provider default"
                }
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
                    ? "•••• saved (encrypted) — paste to replace"
                    : llm.envKeyAvailable
                      ? "Env key available — or paste to store encrypted"
                      : "Paste key (stored encrypted)"
                }
              />
              <p className="mt-1 text-xs text-forest/45">
                {llm.hasApiKey
                  ? "Encrypted key on disk."
                  : llm.envKeyAvailable
                    ? "Using environment key for this provider."
                    : "No key yet."}{" "}
                Keys are never returned or logged.
              </p>
              {llm.hasApiKey && (
                <button
                  type="button"
                  className="btn-ghost mt-2 text-sm text-red-700"
                  onClick={clearLlmKey}
                  disabled={llmBusy}
                >
                  Clear stored key
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button type="submit" className="btn-primary" disabled={llmBusy}>
                {llmBusy ? "Saving…" : "Save LLM settings"}
              </button>
              {llmSaved && (
                <span className="text-sm text-sage-dark">Saved</span>
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-forest/50">Loading LLM settings…</p>
        )}
      </form>

      <div className="card p-5 mt-4 space-y-2">
        <div className="flex items-center gap-2 text-forest">
          <LockIcon size={18} />
          <h2 className="font-serif text-lg">Secret vault</h2>
        </div>
        {vault ? (
          <>
            <p className="text-sm text-forest/75">
              Master key:{" "}
              <span className="font-medium capitalize">
                {vault.source.replace("-", " ")}
              </span>
              {vault.configured ? " · configured" : " · missing"}
            </p>
            <p className="text-xs text-forest/50">{vault.hint}</p>
            <p className="text-xs text-forest/40">
              Set{" "}
              <code className="bg-sage-muted px-1 rounded">
                SECRETS_MASTER_KEY
              </code>{" "}
              (64 hex chars) or rely on the gitignored file at{" "}
              <code className="bg-sage-muted px-1 rounded">
                data/.secrets-master-key
              </code>
              . Same vault encrypts LLM API keys.
            </p>
          </>
        ) : (
          <p className="text-sm text-forest/50">Loading vault status…</p>
        )}
      </div>

      <p className="mt-6 text-xs text-forest/40 tracking-wide uppercase">
        Think. Capture. Act. · A calmer mind &amp; brighter tomorrow.
      </p>
    </div>
  );
}
