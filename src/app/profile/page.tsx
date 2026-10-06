"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "@/components/Icons";
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
      .then(setLlm)
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
    setLlm(await res.json());
    setApiKeyDraft("");
    setLlmBusy(false);
    setLlmSaved(true);
    setTimeout(() => setLlmSaved(false), 2000);
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
          <select
            className="input-field"
            value={profile.language}
            onChange={(e) => setProfile({ ...profile, language: e.target.value })}
          >
            <option>English (India)</option>
            <option>English (US)</option>
            <option>English (UK)</option>
            <option>Hindi</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
            Voice
          </label>
          <select
            className="input-field"
            value={profile.voice}
            onChange={(e) => setProfile({ ...profile, voice: e.target.value })}
          >
            <option>Default voice</option>
            <option>Calm voice</option>
            <option>Bright voice</option>
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm text-forest/80">
          <input
            type="checkbox"
            className="accent-forest"
            checked={profile.readAloud}
            onChange={(e) =>
              setProfile({ ...profile, readAloud: e.target.checked })
            }
          />
          Read replies aloud in Thinking space
        </label>

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
            <label className="flex items-center gap-2 text-sm text-forest/80">
              <input
                type="checkbox"
                className="accent-forest"
                checked={llm.enabled}
                onChange={(e) =>
                  setLlm({ ...llm, enabled: e.target.checked })
                }
              />
              Enable LLM for Thinking space
            </label>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Provider
              </label>
              <select
                className="input-field"
                value={llm.provider}
                onChange={(e) => {
                  const provider = e.target.value as LlmProvider;
                  setLlm({
                    ...llm,
                    provider,
                    model: DEFAULT_MODELS[provider],
                  });
                }}
              >
                {LLM_PROVIDERS.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                Model
              </label>
              <input
                className="input-field"
                value={llm.model}
                onChange={(e) => setLlm({ ...llm, model: e.target.value })}
                placeholder={DEFAULT_MODELS[llm.provider]}
              />
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
