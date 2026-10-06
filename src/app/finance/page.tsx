"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import { ToggleSwitch } from "@/components/ToggleSwitch";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  FinanceIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import {
  FinanceFixedItem,
  FinanceFixedKind,
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

type FixedForm = {
  kind: FinanceFixedKind;
  name: string;
  amount: string;
  currency: string;
  category: string;
  notes: string;
  active: boolean;
};

const emptyFixed: FixedForm = {
  kind: "expense",
  name: "",
  amount: "",
  currency: "INR",
  category: "Other",
  notes: "",
  active: true,
};

type MonthSummary = {
  month: string;
  income: number;
  expenses: number;
  net: number;
  txnIncome: number;
  txnExpenses: number;
  fixedIncome: number;
  fixedExpenses: number;
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

const fieldLabel =
  "block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5";

export default function FinancePage() {
  const confirm = useConfirm();
  const [all, setAll] = useState<FinanceTransaction[]>([]);
  const [fixedItems, setFixedItems] = useState<FinanceFixedItem[]>([]);
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

  const [fixedModalOpen, setFixedModalOpen] = useState(false);
  const [fixedEdit, setFixedEdit] = useState<FinanceFixedItem | null>(null);
  const [fixedForm, setFixedForm] = useState<FixedForm>(emptyFixed);
  const [fixedError, setFixedError] = useState<string | null>(null);
  const [manageFixedOpen, setManageFixedOpen] = useState(false);

  const reload = useCallback(async () => {
    const [allRes, sumRes, rRes, fixedRes] = await Promise.all([
      fetch("/api/finance"),
      fetch(`/api/finance?summary=1&month=${month}`),
      fetch("/api/recurrings"),
      fetch("/api/finance/fixed"),
    ]);
    const items: FinanceTransaction[] = await allRes.json();
    const sumData = await sumRes.json();
    setAll(items);
    setSummary(sumData.summary || null);
    setRecurrings(await rRes.json());
    if (fixedRes.ok) setFixedItems(await fixedRes.json());
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
        `${t.category} ${t.counterparty} ${t.notes} ${t.type}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list.sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)
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

  const fixedIncomes = useMemo(
    () => fixedItems.filter((f) => f.kind === "income"),
    [fixedItems]
  );
  const fixedExpenses = useMemo(
    () => fixedItems.filter((f) => f.kind === "expense"),
    [fixedItems]
  );

  const categoryOptions = useMemo(() => {
    const names = new Set(CATEGORIES);
    for (const t of all) if (t.category) names.add(t.category);
    for (const f of fixedItems) if (f.category) names.add(f.category);
    return Array.from(names)
      .sort((a, b) => a.localeCompare(b))
      .map((c) => ({ value: c, label: c }));
  }, [all, fixedItems]);

  const typeOptions = [
    { value: "", label: "All types" },
    ...TYPES.map((t) => ({ value: t, label: typeLabel(t) })),
  ];
  const formTypeOptions = TYPES.map((t) => ({
    value: t,
    label: typeLabel(t),
  }));
  const statusOptions = STATUSES.map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  }));
  const recurringOptions = [
    { value: "", label: "None" },
    ...recurrings.map((r) => ({ value: r.id, label: r.name })),
  ];
  const fixedKindOptions = [
    { value: "expense", label: "Fixed expense" },
    { value: "income", label: "Fixed income" },
  ];

  const selected = all.find((t) => t.id === selectedId) || null;

  function openCreate(type: FinanceTxType = "expense") {
    setEditing(null);
    const today = new Date().toISOString().slice(0, 10);
    setForm({
      ...emptyForm,
      type,
      date: today.startsWith(month) ? today : `${month}-15`,
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
    if (
      !(await confirm({
        title: "Delete transaction?",
        message: `Delete this ${t.type}?`,
        confirmLabel: "Delete",
      }))
    )
      return;
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

  function openFixedCreate(kind: FinanceFixedKind = "expense") {
    setFixedEdit(null);
    setFixedForm({ ...emptyFixed, kind });
    setFixedError(null);
    setFixedModalOpen(true);
  }

  function openFixedEdit(item: FinanceFixedItem) {
    setFixedEdit(item);
    setFixedForm({
      kind: item.kind,
      name: item.name,
      amount: String(item.amount),
      currency: item.currency,
      category: item.category,
      notes: item.notes,
      active: item.active,
    });
    setFixedError(null);
    setFixedModalOpen(true);
  }

  async function saveFixed(e: React.FormEvent) {
    e.preventDefault();
    setFixedError(null);
    const amount = Number(fixedForm.amount);
    if (!fixedForm.name.trim()) {
      setFixedError("Name is required");
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setFixedError("Enter a valid amount");
      return;
    }
    const payload = {
      kind: fixedForm.kind,
      name: fixedForm.name.trim(),
      amount,
      currency: fixedForm.currency,
      category: fixedForm.category,
      notes: fixedForm.notes,
      active: fixedForm.active,
    };
    const res = fixedEdit
      ? await fetch(`/api/finance/fixed/${fixedEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/finance/fixed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setFixedError(err.error || "Save failed");
      return;
    }
    setFixedModalOpen(false);
    await reload();
  }

  async function toggleFixedActive(item: FinanceFixedItem, active: boolean) {
    await fetch(`/api/finance/fixed/${item.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    await reload();
  }

  async function removeFixed(item: FinanceFixedItem) {
    if (
      !(await confirm({
        title: "Delete fixed item?",
        message: `Delete monthly ${item.kind} “${item.name}”?`,
        confirmLabel: "Delete",
      }))
    )
      return;
    await fetch(`/api/finance/fixed/${item.id}`, { method: "DELETE" });
    await reload();
  }

  const showDetail = mobileDetail;

  return (
    <div className="page-shell h-full min-h-0 flex flex-col gap-4 overflow-hidden">
      <header className="page-header shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest shrink-0">
            <FinanceIcon size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="section-title">Finance.</h1>
            <p className="text-forest/55 mt-1 text-sm">
              Income, expenses, lends, dues &amp; monthly fixed amounts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setManageFixedOpen(true)}
          >
            Fixed monthly
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => openCreate("income")}
          >
            + Income
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => openCreate("expense")}
          >
            <PlusIcon size={16} /> Expense
          </button>
        </div>
      </header>

      <section className="card p-4 shrink-0">
        <div className="mb-4 flex items-center justify-between gap-2">
          <button
            type="button"
            className="btn-ghost px-3 py-1.5"
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <p className="font-serif text-lg text-forest">{monthLabel(month)}</p>
          <button
            type="button"
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
            hint={
              summary
                ? `txns ${money(summary.txnIncome)} + fixed ${money(summary.fixedIncome)}`
                : undefined
            }
            tone="bg-sage-muted/60"
          />
          <StatCard
            label="Expenses"
            value={money(summary?.expenses ?? 0)}
            hint={
              summary
                ? `txns ${money(summary.txnExpenses)} + fixed ${money(summary.fixedExpenses)}`
                : undefined
            }
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
        <div
          className={`flex min-h-0 w-full flex-col gap-3 lg:w-[42%] ${
            showDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex flex-wrap gap-2 items-center">
            <SearchableSelect
              className="w-40"
              options={typeOptions}
              value={typeFilter}
              onChange={setTypeFilter}
              placeholder="All types"
              aria-label="Filter by type"
            />
            <input
              className="input-field flex-1 min-w-[8rem]"
              placeholder="Search…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => openCreate("lend")}
            >
              + Lend
            </button>
            <button
              type="button"
              className="btn-ghost text-sm"
              onClick={() => openCreate("due")}
            >
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
                  <span className="font-medium">
                    {money(remaining(t), t.currency)}
                  </span>
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
                  <span className="font-medium">
                    {money(remaining(t), t.currency)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto scroll-thin pb-4">
            {monthItems.length === 0 && (
              <p className="card p-6 text-center text-sm text-forest/50 border-dashed">
                No transactions in {monthLabel(month)}. Add income or an
                expense — fixed monthly amounts still count in the totals
                above.
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
                className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition min-h-[52px] ${
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
                <span className="shrink-0 font-medium text-forest">
                  {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                  {money(t.amount, t.currency)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col card p-4 md:p-6 overflow-y-auto scroll-thin`}
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
                  <button
                    type="button"
                    className="btn-ghost"
                    onClick={() => openEdit(selected)}
                  >
                    <PencilIcon size={16} /> Edit
                  </button>
                  <button
                    type="button"
                    className="btn-ghost text-red-700"
                    onClick={() => remove(selected)}
                  >
                    <TrashIcon size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field label="Date" value={formatDisplayDate(selected.date)} />
                <Field label="Status" value={selected.status || "—"} />
                {(selected.type === "lend" || selected.type === "due") && (
                  <>
                    <Field
                      label="Settled"
                      value={money(
                        selected.amountSettled || 0,
                        selected.currency
                      )}
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
                    <div className="flex flex-wrap gap-2 items-center">
                      <input
                        className="input-field w-32"
                        type="number"
                        min="0"
                        step="1"
                        placeholder="Repay amt"
                        value={repayAmount}
                        onChange={(e) => setRepayAmount(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={busyId === selected.id}
                        onClick={() => repay(selected)}
                      >
                        Record repayment
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        disabled={busyId === selected.id}
                        onClick={() => settle(selected)}
                      >
                        Mark settled
                      </button>
                    </div>
                    {error && (
                      <p className="text-sm text-red-700" role="alert">
                        {error}
                      </p>
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

      {/* Transaction modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit transaction" : "New transaction"}
      >
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className={fieldLabel}>Type</label>
            <SearchableSelect
              options={formTypeOptions}
              value={form.type}
              onChange={(type) =>
                setForm((f) => ({ ...f, type: type as FinanceTxType }))
              }
              aria-label="Type"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Amount</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="1"
                required
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={fieldLabel}>Currency</label>
              <input
                className="input-field"
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Date</label>
            <input
              className="input-field"
              type="date"
              required
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div>
            <label className={fieldLabel}>Category</label>
            <SearchableSelect
              options={categoryOptions}
              value={form.category}
              onChange={(category) => setForm((f) => ({ ...f, category }))}
              placeholder="Search categories…"
              aria-label="Category"
              required
            />
          </div>
          <div>
            <label className={fieldLabel}>
              Counterparty
              {(form.type === "lend" || form.type === "due") && " (required)"}
            </label>
            <input
              className="input-field"
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
          </div>
          {(form.type === "lend" || form.type === "due") && (
            <div>
              <label className={fieldLabel}>Status</label>
              <SearchableSelect
                options={statusOptions}
                value={form.status}
                onChange={(status) =>
                  setForm((f) => ({
                    ...f,
                    status: status as FinanceSettleStatus,
                  }))
                }
                aria-label="Status"
              />
            </div>
          )}
          <div>
            <label className={fieldLabel}>Linked recurring</label>
            <SearchableSelect
              options={recurringOptions}
              value={form.linkedRecurringId}
              onChange={(linkedRecurringId) =>
                setForm((f) => ({ ...f, linkedRecurringId }))
              }
              placeholder="None"
              aria-label="Linked recurring"
            />
          </div>
          <div>
            <label className={fieldLabel}>Notes</label>
            <textarea
              className="input-field min-h-[80px]"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          {error && (
            <p className="text-sm text-red-700" role="alert">
              {error}
            </p>
          )}
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

      {/* Manage fixed monthly */}
      <Modal
        open={manageFixedOpen}
        onClose={() => setManageFixedOpen(false)}
        title="Monthly fixed amounts"
      >
        <div className="space-y-5">
          <p className="text-sm text-forest/60">
            Active fixed incomes and expenses are added to every month&apos;s
            totals (on top of one-off transactions).
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => openFixedCreate("income")}
            >
              <PlusIcon size={16} /> Fixed income
            </button>
            <button
              type="button"
              className="btn-primary"
              onClick={() => openFixedCreate("expense")}
            >
              <PlusIcon size={16} /> Fixed expense
            </button>
          </div>

          <FixedList
            title="Fixed incomes"
            items={fixedIncomes}
            onToggle={toggleFixedActive}
            onEdit={openFixedEdit}
            onDelete={removeFixed}
          />
          <FixedList
            title="Fixed expenses"
            items={fixedExpenses}
            onToggle={toggleFixedActive}
            onEdit={openFixedEdit}
            onDelete={removeFixed}
          />
        </div>
      </Modal>

      <Modal
        open={fixedModalOpen}
        onClose={() => setFixedModalOpen(false)}
        title={fixedEdit ? "Edit fixed amount" : "New fixed amount"}
      >
        <form onSubmit={saveFixed} className="space-y-3">
          <div>
            <label className={fieldLabel}>Kind</label>
            <SearchableSelect
              options={fixedKindOptions}
              value={fixedForm.kind}
              onChange={(kind) =>
                setFixedForm((f) => ({ ...f, kind: kind as FinanceFixedKind }))
              }
              aria-label="Kind"
              required
            />
          </div>
          <div>
            <label className={fieldLabel}>Name</label>
            <input
              className="input-field"
              required
              value={fixedForm.name}
              onChange={(e) =>
                setFixedForm((f) => ({ ...f, name: e.target.value }))
              }
              placeholder="e.g. Rent, Side retainer"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={fieldLabel}>Amount / month</label>
              <input
                className="input-field"
                type="number"
                min="0"
                step="1"
                required
                value={fixedForm.amount}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, amount: e.target.value }))
                }
              />
            </div>
            <div>
              <label className={fieldLabel}>Currency</label>
              <input
                className="input-field"
                value={fixedForm.currency}
                onChange={(e) =>
                  setFixedForm((f) => ({ ...f, currency: e.target.value }))
                }
              />
            </div>
          </div>
          <div>
            <label className={fieldLabel}>Category</label>
            <SearchableSelect
              options={categoryOptions}
              value={fixedForm.category}
              onChange={(category) =>
                setFixedForm((f) => ({ ...f, category }))
              }
              aria-label="Category"
              required
            />
          </div>
          <div>
            <label className={fieldLabel}>Notes</label>
            <textarea
              className="input-field min-h-[80px]"
              value={fixedForm.notes}
              onChange={(e) =>
                setFixedForm((f) => ({ ...f, notes: e.target.value }))
              }
            />
          </div>
          <ToggleSwitch
            checked={fixedForm.active}
            onChange={(active) => setFixedForm((f) => ({ ...f, active }))}
            label="Include in monthly totals"
          />
          {fixedError && (
            <p className="text-sm text-red-700" role="alert">
              {fixedError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setFixedModalOpen(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {fixedEdit ? "Save" : "Add"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function FixedList({
  title,
  items,
  onToggle,
  onEdit,
  onDelete,
}: {
  title: string;
  items: FinanceFixedItem[];
  onToggle: (item: FinanceFixedItem, active: boolean) => void;
  onEdit: (item: FinanceFixedItem) => void;
  onDelete: (item: FinanceFixedItem) => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-forest/60 mb-2">{title}</h3>
      <ul className="card divide-y divide-forest/5">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex flex-wrap items-center gap-2 px-3 py-2.5 min-h-[52px]"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-forest truncate">
                {item.name}
              </p>
              <p className="text-xs text-forest/45">
                {item.category} · {money(item.amount, item.currency)}/mo
              </p>
            </div>
            <ToggleSwitch
              checked={item.active}
              onChange={(active) => onToggle(item, active)}
              label={item.active ? "On" : "Off"}
              className="min-h-[36px] text-xs"
            />
            <button
              type="button"
              className="btn-ghost shrink-0"
              aria-label={`Edit ${item.name}`}
              onClick={() => onEdit(item)}
            >
              <PencilIcon size={14} />
            </button>
            <button
              type="button"
              className="btn-ghost shrink-0 text-red-700"
              aria-label={`Delete ${item.name}`}
              onClick={() => onDelete(item)}
            >
              <TrashIcon size={14} />
            </button>
          </li>
        ))}
        {items.length === 0 && (
          <li className="px-3 py-4 text-sm text-forest/40">None yet.</li>
        )}
      </ul>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: string;
}) {
  return (
    <div className={`rounded-xl px-3 py-3 ${tone}`}>
      <p className="text-[11px] uppercase tracking-wide text-forest/50">
        {label}
      </p>
      <p className="mt-0.5 font-serif text-lg text-forest md:text-xl">{value}</p>
      {hint && (
        <p className="mt-0.5 text-[10px] text-forest/45 leading-snug">{hint}</p>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-forest/45">
        {label}
      </p>
      <p className="mt-0.5 text-forest">{value}</p>
    </div>
  );
}
