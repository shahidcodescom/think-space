"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  PencilIcon,
  PlusIcon,
  RecurringIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import {
  Project,
  Recurring,
  RecurringCategory,
  RecurringPeriod,
  RecurringStatus,
  SecretPublic,
} from "@/lib/types";

const CATEGORIES: RecurringCategory[] = [
  "Software",
  "Media",
  "Domain",
  "Utilities",
  "Other",
];
const PERIODS: RecurringPeriod[] = ["weekly", "monthly", "yearly", "custom"];
const STATUSES: RecurringStatus[] = ["active", "paused", "cancelled"];

type FormState = {
  name: string;
  category: RecurringCategory;
  amount: string;
  currency: string;
  billingPeriod: RecurringPeriod;
  nextDueDate: string;
  status: RecurringStatus;
  paymentMethod: string;
  url: string;
  notes: string;
  linkedSecretId: string;
  linkedProjectId: string;
};

const emptyForm: FormState = {
  name: "",
  category: "Software",
  amount: "",
  currency: "INR",
  billingPeriod: "monthly",
  nextDueDate: "",
  status: "active",
  paymentMethod: "",
  url: "",
  notes: "",
  linkedSecretId: "",
  linkedProjectId: "",
};

function money(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function daysUntil(iso: string): number | null {
  if (!iso) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso.slice(0, 10)}T12:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function dueTone(r: Recurring) {
  if (r.status === "cancelled") return "border-forest/5 bg-white opacity-70";
  if (r.status === "paused") return "border-peach bg-peach-soft/40";
  const days = daysUntil(r.nextDueDate);
  if (days !== null && days < 0) return "border-red-200 bg-red-50/80";
  if (days !== null && days <= 30) return "border-sage bg-sage-muted/50";
  return "border-forest/5 bg-white";
}

export default function RecurringsPage() {
  const [items, setItems] = useState<Recurring[]>([]);
  const [secrets, setSecrets] = useState<SecretPublic[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Recurring | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [rRes, sRes, pRes] = await Promise.all([
      fetch("/api/recurrings"),
      fetch("/api/secrets"),
      fetch("/api/projects"),
    ]);
    const data: Recurring[] = await rRes.json();
    setItems(data);
    setSecrets(await sRes.json());
    setProjects(await pRes.json());
    setSelectedId((prev) => {
      if (prev && data.some((r) => r.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((r) => {
      if (categoryFilter && r.category !== categoryFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (q && !`${r.name} ${r.notes} ${r.paymentMethod}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [items, categoryFilter, statusFilter, query]);

  const selected = items.find((r) => r.id === selectedId) || null;

  const upcoming = useMemo(() => {
    return items
      .filter((r) => r.status !== "cancelled" && r.nextDueDate)
      .map((r) => ({ r, days: daysUntil(r.nextDueDate)! }))
      .filter(({ days, r }) => days < 0 || (days >= 0 && days <= 30 && r.status === "active"))
      .sort((a, b) => a.days - b.days);
  }, [items]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...emptyForm,
      nextDueDate: new Date().toISOString().slice(0, 10),
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(r: Recurring) {
    setEditing(r);
    setForm({
      name: r.name,
      category: r.category,
      amount: String(r.amount),
      currency: r.currency,
      billingPeriod: r.billingPeriod,
      nextDueDate: r.nextDueDate,
      status: r.status,
      paymentMethod: r.paymentMethod,
      url: r.url,
      notes: r.notes,
      linkedSecretId: r.linkedSecretId || "",
      linkedProjectId: r.linkedProjectId || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = {
      ...form,
      amount: Number(form.amount) || 0,
      linkedSecretId: form.linkedSecretId || null,
      linkedProjectId: form.linkedProjectId || null,
    };
    if (editing) {
      const res = await fetch(`/api/recurrings/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Save failed");
        return;
      }
      const updated = await res.json();
      setSelectedId(updated.id);
    } else {
      const res = await fetch("/api/recurrings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Create failed");
        return;
      }
      const created = await res.json();
      setSelectedId(created.id);
      setMobileDetail(true);
    }
    setModalOpen(false);
    await load();
  }

  async function remove(r: Recurring) {
    if (!confirm(`Delete “${r.name}”?`)) return;
    await fetch(`/api/recurrings/${r.id}`, { method: "DELETE" });
    if (selectedId === r.id) setSelectedId(null);
    setMobileDetail(false);
    await load();
  }

  async function markPaid(r: Recurring) {
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/recurrings/${r.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_paid" }),
      });
      if (res.ok) {
        const updated = await res.json();
        setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
        setSelectedId(updated.id);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Recurrings.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Your personal subscriptions &amp; dues — not client billing.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          <PlusIcon size={16} /> Add recurring
        </button>
      </header>

      <section className="mb-5">
        <h2 className="text-sm font-semibold text-forest/70 mb-2">
          Upcoming dues · next 30 days &amp; overdue
        </h2>
        <div className="flex gap-3 overflow-x-auto scroll-thin pb-1">
          {upcoming.map(({ r, days }) => {
            const overdue = days < 0;
            return (
              <div
                key={r.id}
                className={`card min-w-[230px] px-4 py-3 border ${
                  overdue ? "border-red-200 bg-red-50/70" : "border-sage bg-sage-muted/40"
                }`}
              >
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setSelectedId(r.id);
                    setMobileDetail(true);
                  }}
                >
                  <div className="text-sm font-semibold text-forest truncate">{r.name}</div>
                  <div className="text-xs text-forest/55 mt-0.5">
                    {r.category} · {r.billingPeriod}
                  </div>
                  <div className="text-xs mt-2 flex justify-between gap-2">
                    <span className={overdue ? "text-red-700 font-medium" : "text-forest/70"}>
                      {overdue
                        ? `Overdue · ${formatDisplayDate(r.nextDueDate)}`
                        : `In ${days}d · ${formatDisplayDate(r.nextDueDate)}`}
                    </span>
                    <span className="font-medium text-forest">
                      {money(r.amount, r.currency)}
                    </span>
                  </div>
                </button>
                <button
                  className="btn-ghost text-xs mt-2 w-full justify-center"
                  disabled={busyId === r.id || r.status === "cancelled"}
                  onClick={() => markPaid(r)}
                >
                  Mark paid
                </button>
              </div>
            );
          })}
          {upcoming.length === 0 && (
            <p className="text-sm text-forest/40 py-2">Nothing due in the next 30 days.</p>
          )}
        </div>
      </section>

      <div className="card p-3 mb-4 flex flex-col md:flex-row gap-2 md:items-center">
        <input
          className="input-field md:flex-1"
          placeholder="Search recurrings…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select
          className="input-field md:w-40"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="input-field md:w-36"
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <div
          className={`card p-3 overflow-y-auto scroll-thin space-y-2 max-h-[70vh] ${
            mobileDetail ? "hidden md:block" : ""
          }`}
        >
          {filtered.map((r) => {
            const days = daysUntil(r.nextDueDate);
            const overdue = days !== null && days < 0 && r.status === "active";
            return (
              <button
                key={r.id}
                onClick={() => {
                  setSelectedId(r.id);
                  setMobileDetail(true);
                }}
                className={`w-full text-left rounded-xl px-3 py-3.5 min-h-[52px] border transition-colors active:bg-sage-muted/70 ${
                  selectedId === r.id ? "bg-sage-muted border-sage" : `${dueTone(r)}`
                }`}
              >
                <div className="flex items-center gap-2">
                  <RecurringIcon size={16} className="text-forest/40 shrink-0" />
                  <span className="text-sm font-medium text-forest truncate">{r.name}</span>
                  {overdue && (
                    <span className="text-[10px] uppercase tracking-wide text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                      Overdue
                    </span>
                  )}
                </div>
                <div className="text-xs text-forest/45 mt-1 pl-6 flex justify-between gap-2">
                  <span>
                    {r.category} · {money(r.amount, r.currency)}/{r.billingPeriod}
                  </span>
                  <span>{r.nextDueDate || "—"}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-sm text-forest/40 p-3">No recurrings match.</p>
          )}
        </div>

        <div
          className={`card p-5 overflow-y-auto scroll-thin max-h-[70vh] ${
            !mobileDetail ? "hidden md:block" : ""
          }`}
        >
          {selected ? (
            <>
              <MobileBackButton
                onClick={() => setMobileDetail(false)}
                label="All recurrings"
              />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.name}</h2>
                  <p className="text-xs text-forest/50 mt-1 capitalize">
                    {selected.category} · {selected.status} · {selected.billingPeriod}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-5">
                <Field
                  label="Amount"
                  value={money(selected.amount, selected.currency)}
                />
                <Field
                  label="Next due"
                  value={
                    selected.nextDueDate
                      ? formatDisplayDate(selected.nextDueDate)
                      : "—"
                  }
                />
                <Field label="Payment" value={selected.paymentMethod || "—"} />
                <Field
                  label="URL"
                  value={
                    selected.url ? (
                      <a
                        href={selected.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline decoration-sage-dark/40 break-all"
                      >
                        {selected.url}
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
              </dl>

              {selected.notes && (
                <p className="text-sm text-forest/75 mb-4 whitespace-pre-wrap">
                  {selected.notes}
                </p>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {selected.linkedSecretId && (
                  <Link
                    href={`/secrets?id=${selected.linkedSecretId}`}
                    className="btn-ghost text-xs"
                  >
                    Linked secret
                  </Link>
                )}
                {selected.linkedProjectId && (
                  <Link href="/projects" className="btn-ghost text-xs">
                    Linked project · {selected.linkedProjectId}
                  </Link>
                )}
              </div>

              <button
                className="btn-primary"
                disabled={busyId === selected.id || selected.status === "cancelled"}
                onClick={() => markPaid(selected)}
              >
                Mark paid · bump next due
              </button>
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or add a recurring.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit recurring" : "New recurring"}
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
              value={form.category}
              onChange={(e) =>
                setForm({ ...form, category: e.target.value as RecurringCategory })
              }
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as RecurringStatus })
              }
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              className="input-field"
              placeholder="Amount"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
            />
            <input
              className="input-field"
              placeholder="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select
              className="input-field"
              value={form.billingPeriod}
              onChange={(e) =>
                setForm({ ...form, billingPeriod: e.target.value as RecurringPeriod })
              }
            >
              {PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="date"
              className="input-field"
              value={form.nextDueDate}
              onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })}
              required
            />
          </div>
          <input
            className="input-field"
            placeholder="Payment method note"
            value={form.paymentMethod}
            onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="URL"
            value={form.url}
            onChange={(e) => setForm({ ...form, url: e.target.value })}
          />
          <select
            className="input-field"
            value={form.linkedSecretId}
            onChange={(e) => setForm({ ...form, linkedSecretId: e.target.value })}
          >
            <option value="">No linked secret</option>
            {secrets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            className="input-field"
            value={form.linkedProjectId}
            onChange={(e) => setForm({ ...form, linkedProjectId: e.target.value })}
          >
            <option value="">No linked project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <textarea
            className="input-field min-h-[80px]"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModalOpen(false)}>
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream-soft/80 border border-forest/5 px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-forest/45 mb-0.5">
        {label}
      </dt>
      <dd className="text-forest/85">{value}</dd>
    </div>
  );
}
