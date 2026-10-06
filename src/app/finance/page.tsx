"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  FinanceIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import {
  FinanceSettleStatus,
  FinanceTransaction,
  FinanceTxType,
  Recurring,
} from "@/lib/types";

const TYPES: FinanceTxType[] = ["income", "expense", "lend", "due"];
const STATUSES: FinanceSettleStatus[] = ["open", "partial", "settled"];

const CATEGORIES = [
  "Salary",
  "Freelance",
  "Groceries",
  "Food",
  "Rent",
  "Subscriptions",
  "Transport",
  "Personal",
  "Utilities",
  "Other",
];

type FormState = {
  type: FinanceTxType;
  amount: string;
  currency: string;
  date: string;
  category: string;
  counterparty: string;
  status: FinanceSettleStatus;
  notes: string;
  linkedRecurringId: string;
};

const emptyForm: FormState = {
  type: "expense",
  amount: "",
  currency: "INR",
  date: new Date().toISOString().slice(0, 10),
  category: "Other",
  counterparty: "",
  status: "open",
  notes: "",
  linkedRecurringId: "",
};

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  outstandingLends: number;
  outstandingDues: number;
  openLendCount: number;
  openDueCount: number;
  transactionCount: number;
};

function money(amount: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function remaining(t: FinanceTransaction) {
  if (t.type !== "lend" && t.type !== "due") return 0;
  return Math.max(0, t.amount - (t.amountSettled || 0));
}

function typeLabel(t: FinanceTxType) {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function typeTone(t: FinanceTxType) {
  if (t === "income") return "bg-sage-muted text-forest";
  if (t === "expense") return "bg-peach-soft text-forest";
  if (t === "lend") return "bg-teal-soft text-forest";
  return "bg-red-50 text-forest";
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function FinancePage() {
  const confirm = useConfirm();
  const [all, setAll] = useState<FinanceTransaction[]>([]);
  const [recurrings, setRecurrings] = useState<Recurring[]>([]);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<MonthSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [query, setQuery] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceTransaction | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [repayAmount, setRepayAmount] = useState("");

  const reload = useCallback(async () => {
    const [allRes, sumRes, rRes] = await Promise.all([
      fetch("/api/finance"),
      fetch(`/api/finance?summary=1&month=${month}`),
      fetch("/api/recurrings"),
    ]);
    const items: FinanceTransaction[] = await allRes.json();
    const sumData = await sumRes.json();
    setAll(items);
    setSummary(sumData.summary || null);
    setRecurrings(await rRes.json());
    setSelectedId((prev) => {
      if (prev && items.some((t) => t.id === prev)) return prev;
      const inMonth = items.filter((t) => t.date.startsWith(month));
      return inMonth[0]?.id || items[0]?.id || null;
    });
  }, [month]);

  useEffect(() => {
    reload();
  }, [reload]);

  const monthItems = useMemo(() => {
    let list = all.filter((t) => t.date.startsWith(month));
    if (typeFilter) list = list.filter((t) => t.type === typeFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) =>
        `${t.category} ${t.counterparty} ${t.notes} ${t.type}`.toLowerCase().includes(q)
      );
    }
    return list.sort(
      (a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
    );
  }, [all, month, typeFilter, query]);

  const openLends = useMemo(
    () => all.filter((t) => t.type === "lend" && t.status !== "settled"),
    [all]
  );
  const openDues = useMemo(
    () => all.filter((t) => t.type === "due" && t.status !== "settled"),
    [all]
  );

  const selected = all.find((t) => t.id === selectedId) || null;

  function openCreate(type: FinanceTxType = "expense") {
    setEditing(null);
    setForm({
      ...emptyForm,
      type,
      date: `${month}-01`.slice(0, 7) === month
        ? new Date().toISOString().slice(0, 10).startsWith(month)
          ? new Date().toISOString().slice(0, 10)
          : `${month}-15`
        : `${month}-15`,
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(t: FinanceTransaction) {
    setEditing(t);
    setForm({
      type: t.type,
      amount: String(t.amount),
      currency: t.currency,
      date: t.date,
      category: t.category,
      counterparty: t.counterparty,
      status: t.status || "open",
      notes: t.notes,
      linkedRecurringId: t.linkedRecurringId || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Enter a valid amount");
      return;
    }
    const payload: Record<string, unknown> = {
      type: form.type,
      amount,
      currency: form.currency,
      date: form.date,
      category: form.category,
      counterparty: form.counterparty,
      notes: form.notes,
      linkedRecurringId: form.linkedRecurringId || null,
    };
    if (form.type === "lend" || form.type === "due") {
      payload.status = form.status;
    }
    const res = editing
      ? await fetch(`/api/finance/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/finance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: FinanceTransaction = await res.json();
    setModalOpen(false);
    await reload();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(t: FinanceTransaction) {
    if (!(await confirm({ title: "Delete transaction?", message: `Delete this ${t.type}?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/finance/${t.id}`, { method: "DELETE" });
    if (selectedId === t.id) setSelectedId(null);
    setMobileDetail(false);
    await reload();
  }

  async function settle(t: FinanceTransaction) {
    setBusyId(t.id);
    await fetch(`/api/finance/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settle" }),
    });
    setBusyId(null);
    setRepayAmount("");
    await reload();
  }

  async function repay(t: FinanceTransaction) {
    const amount = Number(repayAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a repayment amount");
      return;
    }
    setBusyId(t.id);
    setError(null);
    await fetch(`/api/finance/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "repay", amount }),
    });
    setBusyId(null);
    setRepayAmount("");
    await reload();
  }

  const showList = !mobileDetail;
  const showDetail = mobileDetail;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <FinanceIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">Finance</h1>
            <p className="text-sm text-forest/60">
              Income, expenses, lends &amp; dues
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => openCreate("income")}>
            + Income
          </button>
          <button className="btn-primary" onClick={() => openCreate("expense")}>
            <PlusIcon size={16} /> Expense
          </button>
        </div>
      </header>

      {/* Month selector + totals */}
      <section className="rounded-2xl border border-forest/10 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            className="btn-ghost px-3 py-1.5"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="font-serif text-lg text-forest">{monthLabel(month)}</p>
          <button
            className="btn-ghost px-3 py-1.5"
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            label="Income"
            value={money(summary?.income ?? 0)}
            tone="bg-sage-muted/60"
          />
          <StatCard
            label="Expenses"
            value={money(summary?.expenses ?? 0)}
            tone="bg-peach-soft/60"
          />
          <StatCard
            label="Net"
            value={money(summary?.net ?? 0)}
            tone="bg-teal-soft/50"
          />
          <StatCard
            label="Txns"
            value={String(summary?.transactionCount ?? monthItems.length)}
            tone="bg-cream"
          />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-forest/5 bg-teal-soft/30 px-3 py-2 text-sm">
            <span className="text-forest/60">Outstanding lends · </span>
            <strong className="text-forest">
              {money(summary?.outstandingLends ?? 0)}
            </strong>
            <span className="text-forest/50">
              {" "}
              ({summary?.openLendCount ?? openLends.length})
            </span>
          </div>
          <div className="rounded-xl border border-forest/5 bg-red-50/60 px-3 py-2 text-sm">
            <span className="text-forest/60">Outstanding dues · </span>
            <strong className="text-forest">
              {money(summary?.outstandingDues ?? 0)}
            </strong>
            <span className="text-forest/50">
              {" "}
              ({summary?.openDueCount ?? openDues.length})
            </span>
          </div>
        </div>
      </section>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        {/* List */}
        <div
          className={`flex min-h-0 w-full flex-col gap-3 lg:w-[42%] ${
            showDetail ? "hidden lg:flex" : "flex"
          } ${showList ? "" : ""}`}
        >
          <div className="flex flex-wrap gap-2">
            <select
              className="input max-w-[9rem]"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">All types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
            <input
              className="input flex-1 min-w-[8rem]"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn-ghost text-sm" onClick={() => openCreate("lend")}>
              + Lend
            </button>
            <button className="btn-ghost text-sm" onClick={() => openCreate("due")}>
              + Due
            </button>
          </div>

          {(openLends.length > 0 || openDues.length > 0) && !typeFilter && (
            <div className="space-y-2">
              {openLends.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    setMobileDetail(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-teal-200/60 bg-teal-soft/40 px-3 py-2 text-left text-sm"
                >
                  <span>
                    Lend · <strong>{t.counterparty || t.category}</strong>
                  </span>
                  <span className="font-medium">{money(remaining(t), t.currency)}</span>
                </button>
              ))}
              {openDues.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(t.id);
                    setMobileDetail(true);
                  }}
                  className="flex w-full items-center justify-between rounded-xl border border-red-200/60 bg-red-50/70 px-3 py-2 text-left text-sm"
                >
                  <span>
                    Due · <strong>{t.counterparty || t.category}</strong>
                  </span>
                  <span className="font-medium">{money(remaining(t), t.currency)}</span>
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
            {monthItems.length === 0 && (
              <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
                No transactions in {monthLabel(month)}. Add income or an expense.
              </p>
            )}
            {monthItems.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSelectedId(t.id);
                  setMobileDetail(true);
                }}
                className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
                  selectedId === t.id
                    ? "border-sage bg-sage-muted"
                    : "border-forest/5 bg-white hover:border-sage/60"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${typeTone(
                        t.type
                      )}`}
                    >
                      {t.type}
                    </span>
                    <span className="truncate font-medium text-forest">
                      {t.category}
                      {t.counterparty ? ` · ${t.counterparty}` : ""}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-forest/50">
                    {formatDisplayDate(t.date)}
                    {t.status ? ` · ${t.status}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 font-medium ${
                    t.type === "income"
                      ? "text-emerald-800"
                      : t.type === "expense"
                        ? "text-forest"
                        : "text-forest"
                  }`}
                >
                  {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                  {money(t.amount, t.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
        >
          <div className="mb-3 lg:hidden">
            <MobileBackButton
              onClick={() => setMobileDetail(false)}
              label="Transactions"
            />
          </div>
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeTone(
                      selected.type
                    )}`}
                  >
                    {selected.type}
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-forest">
                    {money(selected.amount, selected.currency)}
                  </h2>
                  <p className="text-sm text-forest/60">
                    {selected.category}
                    {selected.counterparty ? ` · ${selected.counterparty}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
                    <PencilIcon size={16} /> Edit
                  </button>
                  <button
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Date" value={formatDisplayDate(selected.date)} />
                <Field
                  label="Status"
                  value={selected.status || "—"}
                />
                {(selected.type === "lend" || selected.type === "due") && (
                  <>
                    <Field
                      label="Settled"
                      value={money(selected.amountSettled || 0, selected.currency)}
                    />
                    <Field
                      label="Remaining"
                      value={money(remaining(selected), selected.currency)}
                    />
                  </>
                )}
              </div>

              {selected.notes && (
                <p className="mt-4 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                  {selected.notes}
                </p>
              )}

              {selected.linkedRecurringId && (
                <Link
                  href="/recurrings"
                  className="mt-3 inline-block text-sm text-forest underline-offset-2 hover:underline"
                >
                  Linked recurring · {selected.linkedRecurringId}
                </Link>
              )}

              {(selected.type === "lend" || selected.type === "due") &&
                selected.status !== "settled" && (
                  <div className="mt-6 space-y-3 rounded-xl border border-forest/10 bg-cream/50 p-4">
                    <p className="text-sm font-medium text-forest">
                      Settlement
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className="input w-32"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Repay amt"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                      />
                      <button
                        className="btn-ghost"
                        disabled={busyId === selected.id}
                        onClick={() => repay(selected)}
                      >
                        Record repayment
                      </button>
                      <button
                        className="btn-primary"
                        disabled={busyId === selected.id}
                        onClick={() => settle(selected)}
                      >
                        Mark settled
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-700">{error}</p>
                    )}
                  </div>
                )}
            </>
          ) : (
            <p className="m-auto text-sm text-forest/50">
              Select a transaction to view details.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit transaction" : "New transaction"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Type</span>
            <select
              className="input w-full"
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({ ...f, type: e.target.value as FinanceTxType }))
              }
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {typeLabel(t)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Amount</span>
              <input
                className="input w-full"
                type="number"
                min="0"
                step="1"
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Currency</span>
              <input
                className="input w-full"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Date</span>
            <input
              className="input w-full"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Category</span>
            <input
              className="input w-full"
              list="finance-cats"
              value={form.category}
              onChange={(e) =>
                setForm((f) => ({ ...f, category: e.target.value }))
              }
            />
            <datalist id="finance-cats">
              {CATEGORIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">
              Counterparty
              {(form.type === "lend" || form.type === "due") && " (required)"}
            </span>
            <input
              className="input w-full"
              value={form.counterparty}
              onChange={(e) =>
                setForm((f) => ({ ...f, counterparty: e.target.value }))
              }
              placeholder={
                form.type === "lend"
                  ? "Who you lent to"
                  : form.type === "due"
                    ? "Who you owe"
                    : "Optional"
              }
            />
          </label>
          {(form.type === "lend" || form.type === "due") && (
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Status</span>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as FinanceSettleStatus,
                  }))
                }
              >
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Linked recurring</span>
            <select
              className="input w-full"
              value={form.linkedRecurringId}
              onChange={(e) =>
                setForm((f) => ({ ...f, linkedRecurringId: e.target.value }))
              }
            >
              <option value="">None</option>
              {recurrings.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Notes</span>
            <textarea
              className="input min-h-[4rem] w-full"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </label>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editing ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className={`rounded-xl px-3 py-3 ${tone}`}>
      <p className="text-[11px] uppercase tracking-wide text-forest/50">{label}</p>
      <p className="mt-0.5 font-serif text-lg text-forest md:text-xl">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-forest/45">{label}</p>
      <p className="mt-0.5 text-forest">{value}</p>
    </div>
  );
}
