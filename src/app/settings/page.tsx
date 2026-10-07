"use client";

import { useEffect, useState } from "react";
import { LockIcon } from "@/components/Icons";
import { LlmSettingsPanel } from "@/components/LlmSettingsPanel";
import { useConfirm } from "@/components/ConfirmDialog";
import { SYSTEM_RESET_PHRASE } from "@/lib/system-reset-phrase";

type VaultStatus = { configured: boolean; source: string; hint: string };

export default function SettingsPage() {
  const confirm = useConfirm();
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState("");

  useEffect(() => {
    fetch("/api/secrets/status")
      .then((r) => r.json())
      .then(setVault)
      .catch(() => setVault(null));
  }, []);

  async function systemReset() {
    setResetError("");
    const ok = await confirm({
      title: "Reset entire system?",
      message:
        "This permanently deletes notes, tasks, secrets, uploads, chat history, LLM keys stored in settings, and your login account.\n\nYou will be signed out and sent to first-run setup.\n\nSecret category names are restored to defaults. The vault master-key file and environment variables are kept.",
      confirmLabel: "Reset system",
      cancelLabel: "Keep my data",
      destructive: true,
      confirmText: SYSTEM_RESET_PHRASE,
    });
    if (!ok) return;

    setResetBusy(true);
    try {
      const res = await fetch("/api/system/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmPhrase: SYSTEM_RESET_PHRASE }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResetError(data.error || "Reset failed");
        setResetBusy(false);
        return;
      }
      window.location.href = "/setup";
    } catch {
      setResetError("Network error");
      setResetBusy(false);
    }
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen max-w-xl">
      <header className="mb-6">
        <h1 className="section-title">Settings.</h1>
        <p className="text-forest/55 mt-1 text-sm">
          Thinking-space LLM, RAG, intents, Postgres, vault, and system reset.
        </p>
      </header>

      <LlmSettingsPanel />

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

      <div className="card p-5 mt-4 space-y-3 border border-red-200/80">
        <h2 className="font-serif text-lg text-red-800">Danger zone</h2>
        <p className="text-sm text-forest/65 leading-relaxed">
          System reset wipes local JSON data, uploads, the account, and stored
          LLM keys, then returns you to{" "}
          <span className="font-medium">/setup</span>. Type{" "}
          <code className="bg-sage-muted px-1 rounded">{SYSTEM_RESET_PHRASE}</code>{" "}
          in the confirmation dialog.
        </p>
        <ul className="text-xs text-forest/50 list-disc pl-5 space-y-1">
          <li>Wiped: all modules, secrets, chat, auth, LLM settings, uploads</li>
          <li>Reseeded: default secret categories &amp; built-in intents</li>
          <li>Kept: vault key file &amp; environment variables; Postgres not cleared</li>
        </ul>
        {resetError && (
          <p className="text-sm text-red-700/90 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {resetError}
          </p>
        )}
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-700 text-white px-4 py-2.5 min-h-[44px] text-sm font-medium hover:bg-red-800 disabled:opacity-50"
          onClick={systemReset}
          disabled={resetBusy}
        >
          {resetBusy ? "Resetting…" : "Reset system…"}
        </button>
      </div>

      <p className="mt-6 text-xs text-forest/40 tracking-wide uppercase">
        Think. Capture. Act. · A calmer mind &amp; brighter tomorrow.
      </p>
    </div>
  );
}
