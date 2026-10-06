"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import {
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { MobileBackButton } from "@/components/MobileBackButton";
import { SecretPublic } from "@/lib/types";

type VaultStatus = {
  configured: boolean;
  source: string;
  hint: string;
};

type FormState = {
  name: string;
  category: string;
  tags: string;
  notes: string;
  value: string;
};

const emptyForm: FormState = {
  name: "",
  category: "API Keys",
  tags: "",
  notes: "",
  value: "",
};

function SecretsInner() {
  const search = useSearchParams();
  const [secrets, setSecrets] = useState<SecretPublic[]>([]);
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SecretPublic | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [showValue, setShowValue] = useState(false);
  const [revealed, setRevealed] = useState<string | null>(null);
  const [revealBusy, setRevealBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [listRes, statusRes] = await Promise.all([
      fetch("/api/secrets"),
      fetch("/api/secrets/status"),
    ]);
    const list: SecretPublic[] = await listRes.json();
    setSecrets(list);
    setStatus(await statusRes.json());
    const qid = search.get("id");
    setSelectedId((prev) => {
      if (qid && list.some((s) => s.id === qid)) return qid;
      if (prev && list.some((s) => s.id === prev)) return prev;
      return list[0]?.id || null;
    });
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const qid = search.get("id");
    if (qid) {
      setSelectedId(qid);
      setMobileDetail(true);
    }
  }, [search]);

  useEffect(() => {
    setRevealed(null);
    setShowValue(false);
    setCopied(false);
    setError(null);
  }, [selectedId]);

  const selected = secrets.find((s) => s.id === selectedId) || null;

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  function openEdit(secret: SecretPublic) {
    setEditing(secret);
    setForm({
      name: secret.name,
      category: secret.category,
      tags: secret.tags.join(", "),
      notes: secret.notes,
      value: "",
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editing) {
      const body: Record<string, string> = {
        name: form.name,
        category: form.category,
        tags: form.tags,
        notes: form.notes,
      };
      if (form.value.trim()) body.value = form.value;
      const res = await fetch(`/api/secrets/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Save failed");
        return;
      }
      const updated = await res.json();
      setSecrets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      setSelectedId(updated.id);
    } else {
      const res = await fetch("/api/secrets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Create failed");
        return;
      }
      const created = await res.json();
      setSecrets((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
    setModalOpen(false);
  }

  async function remove(secret: SecretPublic) {
    if (!confirm(`Delete secret “${secret.name}”? This cannot be undone.`)) return;
    await fetch(`/api/secrets/${secret.id}`, { method: "DELETE" });
    setSecrets((prev) => prev.filter((s) => s.id !== secret.id));
    if (selectedId === secret.id) setSelectedId(null);
  }

  async function reveal() {
    if (!selected) return;
    setRevealBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/secrets/${selected.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Reveal failed");
        return;
      }
      setRevealed(data.value);
      setShowValue(true);
    } finally {
      setRevealBusy(false);
    }
  }

  async function copyValue() {
    let value = revealed;
    if (!value && selected) {
      const res = await fetch(`/api/secrets/${selected.id}/reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Copy failed");
        return;
      }
      value = data.value;
      setRevealed(value);
    }
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Secrets.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            API keys, passwords, and tokens — encrypted at rest.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          <PlusIcon size={16} /> Add secret
        </button>
      </header>

      {status && (
        <div className="card px-4 py-3 mb-4 flex items-start gap-3 bg-sage-muted/40">
          <LockIcon size={18} className="text-forest/60 mt-0.5 shrink-0" />
          <div className="text-sm text-forest/75">
            <span className="font-medium text-forest">Vault ready</span>
            <span className="text-forest/40"> · </span>
            <span className="capitalize">{status.source.replace("-", " ")}</span>
            <p className="text-xs text-forest/50 mt-0.5">{status.hint}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className={`card p-3 overflow-y-auto scroll-thin space-y-2 max-h-[70vh] ${mobileDetail ? "hidden md:block" : ""}`}>
          {secrets.map((s) => (
            <button
              key={s.id}
              onClick={() => { setSelectedId(s.id); setMobileDetail(true); }}
              className={`w-full text-left rounded-xl px-3 py-3.5 min-h-[52px] transition-colors active:bg-sage-muted/70 ${
                selectedId === s.id ? "bg-sage-muted" : "hover:bg-cream"
              }`}
            >
              <div className="flex items-center gap-2">
                <LockIcon size={14} className="text-forest/40 shrink-0" />
                <span className="text-sm font-medium text-forest truncate">
                  {s.name}
                </span>
              </div>
              <div className="text-xs text-forest/45 mt-1 pl-5">
                {s.category}
                {s.tags.length > 0 ? ` · ${s.tags.slice(0, 2).join(", ")}` : ""}
              </div>
            </button>
          ))}
          {secrets.length === 0 && (
            <p className="text-sm text-forest/40 p-3">No secrets yet.</p>
          )}
        </div>

        <div className={`card p-5 ${!mobileDetail ? "hidden md:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All secrets" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.name}</h2>
                  <p className="text-xs text-forest/45 mt-1">{selected.category}</p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={14} /> Delete
                  </button>
                </div>
              </div>

              {selected.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {selected.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wide bg-forest/5 text-forest/60 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {selected.notes && (
                <p className="text-sm text-forest/70 mb-5 whitespace-pre-wrap">
                  {selected.notes}
                </p>
              )}

              <div className="rounded-xl border border-forest/10 bg-cream-soft/80 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-2">
                  Secret value
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono text-sm text-forest bg-white rounded-lg px-3 py-2.5 border border-forest/5 break-all min-h-[42px]">
                    {showValue && revealed
                      ? revealed
                      : "••••••••••••••••••••"}
                  </code>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    disabled={revealBusy}
                    onClick={async () => {
                      if (showValue) {
                        setShowValue(false);
                        return;
                      }
                      if (revealed) {
                        setShowValue(true);
                        return;
                      }
                      await reveal();
                    }}
                    aria-label={showValue ? "Hide value" : "Reveal value"}
                  >
                    {showValue ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                  <button
                    type="button"
                    className="btn-ghost shrink-0"
                    onClick={copyValue}
                    aria-label="Copy value"
                  >
                    <CopyIcon size={16} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="text-[11px] text-forest/40 mt-2">
                  Value stays encrypted until you reveal or copy. It is never
                  included in list responses.
                </p>
              </div>

              {error && (
                <p className="text-sm text-red-700 mt-3" role="alert">
                  {error}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or add a secret.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit secret" : "New secret"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <input
            className="input-field"
            placeholder="Name / label"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="input-field"
            placeholder="Category (e.g. API Keys)"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <textarea
            className="input-field min-h-[80px]"
            placeholder="Notes (optional, not encrypted)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
              {editing ? "New value (leave blank to keep)" : "Value"}
            </label>
            <input
              type="password"
              className="input-field font-mono"
              placeholder={editing ? "••••••••" : "Paste secret value"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required={!editing}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SecretsPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6 text-sm text-forest/50">Loading secrets…</div>
      }
    >
      <SecretsInner />
    </Suspense>
  );
}
