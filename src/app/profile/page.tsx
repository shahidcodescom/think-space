"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "@/components/Icons";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { LlmSettingsPanel } from "@/components/LlmSettingsPanel";
import { SearchableSelect } from "@/components/SearchableSelect";
import { Profile } from "@/lib/types";

type VaultStatus = { configured: boolean; source: string; hint: string };

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [vault, setVault] = useState<VaultStatus | null>(null);

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then(setProfile);
    fetch("/api/secrets/status")
      .then((r) => r.json())
      .then(setVault)
      .catch(() => setVault(null));
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
          Name, voice, language, Thinking-space LLM / RAG / intents, and vault.
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

            <div className="mt-4">
        <LlmSettingsPanel />
      </div>

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
