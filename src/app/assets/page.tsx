"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import {
  AssetIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import { Asset, AssetStatus, AssetType } from "@/lib/types";

const TYPES: AssetType[] = ["Hardware", "Software", "Document", "Media", "Other"];
const STATUSES: AssetStatus[] = ["Active", "In repair", "Retired", "Lost"];

type FormState = {
  name: string;
  type: AssetType;
  status: AssetStatus;
  serial: string;
  purchaseDate: string;
  value: string;
  location: string;
  owner: string;
  tags: string;
  notes: string;
  relatedSecretIds: string;
  relatedNoteIds: string;
};

const emptyForm: FormState = {
  name: "",
  type: "Hardware",
  status: "Active",
  serial: "",
  purchaseDate: "",
  value: "",
  location: "",
  owner: "",
  tags: "",
  notes: "",
  relatedSecretIds: "",
  relatedNoteIds: "",
};

function statusTone(status: AssetStatus): string {
  switch (status) {
    case "Active":
      return "bg-sage-muted text-forest";
    case "In repair":
      return "bg-peach-soft text-forest";
    case "Retired":
      return "bg-forest/5 text-forest/60";
    case "Lost":
      return "bg-red-50 text-red-800";
    default:
      return "bg-cream text-forest/70";
  }
}

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.set("type", typeFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (query.trim()) params.set("q", query.trim());
    const res = await fetch(`/api/assets?${params.toString()}`);
    const data: Asset[] = await res.json();
    setAssets(data);
    setSelectedId((prev) => {
      if (prev && data.some((a) => a.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, [typeFilter, statusFilter, query]);

  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 150);
    return () => clearTimeout(t);
  }, [load]);

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId) || null,
    [assets, selectedId]
  );

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      purchaseDate: new Date().toISOString().slice(0, 10),
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(asset: Asset) {
    setEditing(asset);
    setForm({
      name: asset.name,
      type: asset.type,
      status: asset.status,
      serial: asset.serial,
      purchaseDate: asset.purchaseDate,
      value: asset.value === null ? "" : String(asset.value),
      location: asset.location,
      owner: asset.owner,
      tags: asset.tags.join(", "),
      notes: asset.notes,
      relatedSecretIds: asset.relatedSecretIds.join(", "),
      relatedNoteIds: asset.relatedNoteIds.join(", "),
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      ...form,
      value: form.value === "" ? null : Number(form.value),
    };
    if (editing) {
      const res = await fetch(`/api/assets/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Save failed");
        return;
      }
    } else {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Create failed");
        return;
      }
      const created = await res.json();
      setSelectedId(created.id);
    }
    setModalOpen(false);
    await load();
  }

  async function remove(asset: Asset) {
    if (!confirm(`Delete asset “${asset.name}”?`)) return;
    await fetch(`/api/assets/${asset.id}`, { method: "DELETE" });
    if (selectedId === asset.id) setSelectedId(null);
    await load();
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen px-4 md:px-8 py-6">
      <header className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="section-title">Assets.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Hardware, licenses, documents, and media — calmly tracked.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          <PlusIcon size={16} /> Add asset
        </button>
      </header>

      <div className="card p-3 mb-4 flex flex-col md:flex-row gap-2 md:items-center">
        <input
          className="input-field md:flex-1"
          placeholder="Search name, serial, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input-field md:w-40"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input-field md:w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <span className="text-xs text-forest/45 px-2 shrink-0">
          {assets.length} shown
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <div className="card p-3 overflow-y-auto scroll-thin space-y-2 max-h-[70vh]">
          {assets.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedId(a.id)}
              className={`w-full text-left rounded-xl px-3 py-3 transition-colors ${
                selectedId === a.id ? "bg-sage-muted" : "hover:bg-cream"
              }`}
            >
              <div className="flex items-start gap-2">
                <AssetIcon size={16} className="text-forest/40 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-forest truncate">
                    {a.name}
                  </div>
                  <div className="text-xs text-forest/45 mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                    <span>{a.type}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 ${statusTone(a.status)}`}
                    >
                      {a.status}
                    </span>
                  </div>
                  {a.serial && (
                    <div className="text-[11px] font-mono text-forest/35 mt-1 truncate">
                      {a.serial}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
          {assets.length === 0 && (
            <p className="text-sm text-forest/40 p-3">No assets match.</p>
          )}
        </div>

        <div className="card p-5 overflow-y-auto scroll-thin">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.name}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-xs text-forest/50">{selected.type}</span>
                    <span
                      className={`text-xs rounded-full px-2 py-0.5 ${statusTone(
                        selected.status
                      )}`}
                    >
                      {selected.status}
                    </span>
                  </div>
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

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
                <Field label="Serial / ID" value={selected.serial || "—"} mono />
                <Field
                  label="Purchase date"
                  value={
                    selected.purchaseDate
                      ? formatDisplayDate(selected.purchaseDate)
                      : "—"
                  }
                />
                <Field label="Value" value={formatMoney(selected.value)} />
                <Field label="Location" value={selected.location || "—"} />
                <Field label="Owner" value={selected.owner || "—"} />
              </dl>

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
                <div className="rounded-xl bg-cream-soft border border-forest/5 px-4 py-3 mb-5">
                  <div className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1">
                    Notes
                  </div>
                  <p className="text-sm text-forest/75 whitespace-pre-wrap">
                    {selected.notes}
                  </p>
                </div>
              )}

              {(selected.relatedNoteIds.length > 0 ||
                selected.relatedSecretIds.length > 0) && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wide text-forest/50">
                    Related
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selected.relatedNoteIds.map((id) => (
                      <Link
                        key={id}
                        href={`/notes?id=${id}`}
                        className="btn-ghost text-xs"
                      >
                        Note · {id}
                      </Link>
                    ))}
                    {selected.relatedSecretIds.map((id) => (
                      <Link
                        key={id}
                        href="/secrets"
                        className="btn-ghost text-xs"
                      >
                        Secret · {id}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or add an asset.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit asset" : "New asset"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <input
            className="input-field"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input-field"
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as AssetType })
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as AssetStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <input
            className="input-field font-mono text-sm"
            placeholder="Serial / ID"
            value={form.serial}
            onChange={(e) => setForm({ ...form, serial: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              className="input-field"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
            />
            <input
              type="number"
              step="any"
              className="input-field"
              placeholder="Value / cost"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <input
            className="input-field"
            placeholder="Location"
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Owner"
            value={form.owner}
            onChange={(e) => setForm({ ...form, owner: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
          />
          <textarea
            className="input-field min-h-[90px]"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <input
            className="input-field text-sm"
            placeholder="Related note IDs (comma separated)"
            value={form.relatedNoteIds}
            onChange={(e) => setForm({ ...form, relatedNoteIds: e.target.value })}
          />
          <input
            className="input-field text-sm"
            placeholder="Related secret IDs (comma separated)"
            value={form.relatedSecretIds}
            onChange={(e) =>
              setForm({ ...form, relatedSecretIds: e.target.value })
            }
          />
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

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-xl bg-cream-soft/80 border border-forest/5 px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-forest/45 mb-0.5">
        {label}
      </dt>
      <dd className={`text-forest/85 ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}
