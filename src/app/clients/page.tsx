"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  ClientsIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import { MobileBackButton } from "@/components/MobileBackButton";
import { formatDisplayDate } from "@/lib/format";
import {
  BillingPeriod,
  Client,
  Payment,
  PaymentStatus,
  Project,
  Subscription,
  SubscriptionStatus,
} from "@/lib/types";

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

function subTone(status: SubscriptionStatus, renewalDate: string) {
  const days = daysUntil(renewalDate);
  if (status === "past_due" || (days !== null && days < 0 && status !== "cancelled")) {
    return "border-red-200 bg-red-50/80";
  }
  if (status === "trial") return "border-peach bg-peach-soft/50";
  if (days !== null && days <= 30 && status === "active") {
    return "border-sage bg-sage-muted/50";
  }
  return "border-forest/5 bg-white";
}

export default function ClientsPage() {
  const confirm = useConfirm();
  const [clients, setClients] = useState<Client[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");

  const [clientModal, setClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState({
    name: "",
    email: "",
    company: "",
    notes: "",
  });

  const [subModal, setSubModal] = useState(false);
  const [subForm, setSubForm] = useState({
    clientId: "",
    projectId: "",
    plan: "",
    status: "active" as SubscriptionStatus,
    startDate: "",
    renewalDate: "",
    amount: "",
    currency: "USD",
    billingPeriod: "monthly" as BillingPeriod,
    notes: "",
  });

  const [payModal, setPayModal] = useState(false);
  const [payForm, setPayForm] = useState({
    clientId: "",
    subscriptionId: "",
    amount: "",
    currency: "USD",
    date: "",
    method: "Card",
    status: "paid" as PaymentStatus,
    reference: "",
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [cRes, sRes, pRes, projRes] = await Promise.all([
      fetch("/api/clients"),
      fetch("/api/subscriptions"),
      fetch("/api/payments"),
      fetch("/api/projects?status=live"),
    ]);
    const cData: Client[] = await cRes.json();
    setClients(cData);
    setSubscriptions(await sRes.json());
    setPayments(await pRes.json());
    setProjects(await projRes.json());
    setSelectedId((prev) => {
      if (prev && cData.some((c) => c.id === prev)) return prev;
      return cData[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const liveProjects = projects.filter((p) => p.status === "live");
  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string) => map.get(id) || id;
  }, [projects]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter((s) => {
      if (projectFilter && s.projectId !== projectFilter) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      return true;
    });
  }, [subscriptions, projectFilter, statusFilter]);

  const filteredClients = useMemo(() => {
    const q = query.toLowerCase().trim();
    let list = clients;
    if (q) {
      list = list.filter((c) =>
        `${c.name} ${c.email} ${c.company}`.toLowerCase().includes(q)
      );
    }
    // If filters active, only clients with matching subs
    if (projectFilter || statusFilter) {
      const ids = new Set(filteredSubs.map((s) => s.clientId));
      list = list.filter((c) => ids.has(c.id));
    }
    return list;
  }, [clients, query, projectFilter, statusFilter, filteredSubs]);

  const selected = clients.find((c) => c.id === selectedId) || null;
  const clientSubs = subscriptions.filter((s) => s.clientId === selectedId);
  const clientPays = payments.filter((p) => p.clientId === selectedId);

  const renewals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    return subscriptions
      .filter((s) => s.status !== "cancelled" && s.renewalDate)
      .map((s) => ({ s, days: daysUntil(s.renewalDate)! }))
      .filter(({ s, days }) => {
        if (s.status === "past_due" || days < 0) return true;
        return days >= 0 && days <= 30;
      })
      .sort((a, b) => a.days - b.days);
  }, [subscriptions]);

  function openCreateClient() {
    setEditingClient(null);
    setClientForm({ name: "", email: "", company: "", notes: "" });
    setError(null);
    setClientModal(true);
  }

  function openEditClient(c: Client) {
    setEditingClient(c);
    setClientForm({
      name: c.name,
      email: c.email,
      company: c.company,
      notes: c.notes,
    });
    setError(null);
    setClientModal(true);
  }

  async function saveClient(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (editingClient) {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Save failed");
        return;
      }
    } else {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientForm),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Create failed");
        return;
      }
      const created = await res.json();
      setSelectedId(created.id);
    }
    setClientModal(false);
    await load();
  }

  async function deleteClient(c: Client) {
    if (!(await confirm({ title: "Delete client?", message: `Delete client “${c.name}” and related subscriptions/payments?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/clients/${c.id}`, { method: "DELETE" });
    if (selectedId === c.id) setSelectedId(null);
    await load();
  }

  function openSubModal() {
    setSubForm({
      clientId: selectedId || "",
      projectId: liveProjects[0]?.id || "",
      plan: "",
      status: "active",
      startDate: new Date().toISOString().slice(0, 10),
      renewalDate: "",
      amount: "",
      currency: "USD",
      billingPeriod: "monthly",
      notes: "",
    });
    setError(null);
    setSubModal(true);
  }

  async function saveSub(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...subForm,
        amount: Number(subForm.amount) || 0,
      }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Create failed");
      return;
    }
    setSubModal(false);
    await load();
  }

  function openPayModal(sub?: Subscription) {
    setPayForm({
      clientId: selectedId || sub?.clientId || "",
      subscriptionId: sub?.id || "",
      amount: sub ? String(sub.amount) : "",
      currency: sub?.currency || "USD",
      date: new Date().toISOString().slice(0, 10),
      method: "Card",
      status: "paid",
      reference: "",
      notes: "",
    });
    setError(null);
    setPayModal(true);
  }

  async function savePay(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payForm,
        subscriptionId: payForm.subscriptionId || null,
        amount: Number(payForm.amount) || 0,
      }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error || "Create failed");
      return;
    }
    setPayModal(false);
    await load();
  }

  async function markRenewed(sub: Subscription) {
    setBusy(true);
    try {
      await fetch(`/api/subscriptions/${sub.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "renew" }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Clients.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Subscriptions, renewals, and payments for live products.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreateClient}>
          <PlusIcon size={16} /> Add client
        </button>
      </header>

      {/* Upcoming renewals */}
      <section className="mb-5">
        <h2 className="text-sm font-semibold text-forest/70 mb-2">
          Upcoming renewals · next 30 days &amp; overdue
        </h2>
        <div className="flex gap-3 overflow-x-auto scroll-thin pb-1">
          {renewals.map(({ s, days }) => {
            const client = clients.find((c) => c.id === s.clientId);
            const overdue = days < 0 || s.status === "past_due";
            return (
              <div
                key={s.id}
                className={`card min-w-[240px] px-4 py-3 border ${
                  overdue ? "border-red-200 bg-red-50/70" : "border-sage bg-sage-muted/40"
                }`}
              >
                <div className="text-sm font-semibold text-forest truncate">
                  {client?.name || "Client"}
                </div>
                <div className="text-xs text-forest/55 mt-0.5 truncate">
                  {s.plan} · {projectName(s.projectId)}
                </div>
                <div className="text-xs mt-2 flex justify-between gap-2">
                  <span className={overdue ? "text-red-700 font-medium" : "text-forest/70"}>
                    {overdue
                      ? `Overdue · ${formatDisplayDate(s.renewalDate)}`
                      : `In ${days}d · ${formatDisplayDate(s.renewalDate)}`}
                  </span>
                  <span className="font-medium text-forest">
                    {money(s.amount, s.currency)}
                  </span>
                </div>
                <button
                  className="btn-ghost text-xs mt-2 w-full justify-center"
                  disabled={busy}
                  onClick={() => {
                    setSelectedId(s.clientId);
                    markRenewed(s);
                  }}
                >
                  Mark renewed
                </button>
              </div>
            );
          })}
          {renewals.length === 0 && (
            <p className="text-sm text-forest/40 py-2">No renewals in the next 30 days.</p>
          )}
        </div>
      </section>

      {/* Filters */}
      <div className="card p-3 mb-4 flex flex-col md:flex-row gap-2 md:items-center">
        <input
          className="input-field md:flex-1"
          placeholder="Search clients…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchableSelect
          className="md:w-48"
          options={[
            { value: "", label: "All live products" },
            ...liveProjects.map((p) => ({ value: p.id, label: p.name })),
          ]}
          value={projectFilter}
          onChange={setProjectFilter}
          placeholder="All live products"
          aria-label="Filter by product"
        />
        <SearchableSelect
          className="md:w-40"
          options={[
            { value: "", label: "All statuses" },
            { value: "active", label: "Active" },
            { value: "past_due", label: "Past due" },
            { value: "trial", label: "Trial" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
          aria-label="Filter by status"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Client list */}
        <div className={`card p-3 overflow-y-auto scroll-thin space-y-2 max-h-[70vh] ${mobileDetail ? "hidden md:block" : ""}`}>
          {filteredClients.map((c) => {
            const pastDue = subscriptions.some(
              (s) => s.clientId === c.id && s.status === "past_due"
            );
            return (
              <button
                key={c.id}
                onClick={() => { setSelectedId(c.id); setMobileDetail(true); }}
                className={`w-full text-left rounded-xl px-3 py-3.5 min-h-[52px] transition-colors active:bg-sage-muted/70 ${
                  selectedId === c.id ? "bg-sage-muted" : "hover:bg-cream"
                }`}
              >
                <div className="flex items-center gap-2">
                  <ClientsIcon size={16} className="text-forest/40 shrink-0" />
                  <span className="text-sm font-medium text-forest truncate">{c.name}</span>
                  {pastDue && (
                    <span className="text-[10px] uppercase tracking-wide text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full">
                      Past due
                    </span>
                  )}
                </div>
                <div className="text-xs text-forest/45 mt-0.5 pl-6 truncate">
                  {c.company || c.email || "—"}
                </div>
              </button>
            );
          })}
          {filteredClients.length === 0 && (
            <p className="text-sm text-forest/40 p-3">No clients match.</p>
          )}
        </div>

        {/* Detail */}
        <div className={`card p-5 overflow-y-auto scroll-thin max-h-[70vh] ${!mobileDetail ? "hidden md:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All clients" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.name}</h2>
                  <p className="text-sm text-forest/55 mt-1">
                    {selected.company}
                    {selected.company && selected.email ? " · " : ""}
                    {selected.email}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEditClient(selected)}>
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button
                    className="btn-ghost text-red-700"
                    onClick={() => deleteClient(selected)}
                  >
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              {selected.notes && (
                <p className="text-sm text-forest/70 mb-5 whitespace-pre-wrap">{selected.notes}</p>
              )}

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-forest">Subscriptions</h3>
                <button className="btn-ghost text-xs" onClick={openSubModal}>
                  <PlusIcon size={14} /> Add subscription
                </button>
              </div>
              <div className="space-y-2 mb-6">
                {clientSubs.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-xl border px-4 py-3 ${subTone(s.status, s.renewalDate)}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold text-forest">{s.plan}</div>
                        <div className="text-xs text-forest/55 mt-0.5">
                          {projectName(s.projectId)} · {s.status.replace("_", " ")} ·{" "}
                          {s.billingPeriod}
                        </div>
                        <div className="text-xs text-forest/50 mt-1">
                          Renews {s.renewalDate ? formatDisplayDate(s.renewalDate) : "—"} ·{" "}
                          {money(s.amount, s.currency)}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          className="btn-ghost text-xs"
                          disabled={busy || s.status === "cancelled"}
                          onClick={() => markRenewed(s)}
                        >
                          Mark renewed
                        </button>
                        <button
                          className="btn-ghost text-xs"
                          onClick={() => openPayModal(s)}
                        >
                          Add payment
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {clientSubs.length === 0 && (
                  <p className="text-sm text-forest/40">No subscriptions yet.</p>
                )}
              </div>

              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-forest">Payments</h3>
                <button className="btn-ghost text-xs" onClick={() => openPayModal()}>
                  <PlusIcon size={14} /> Add payment
                </button>
              </div>
              <div className="space-y-2">
                {clientPays.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-forest/5 bg-cream-soft/70 px-4 py-2.5 flex flex-wrap justify-between gap-2 text-sm"
                  >
                    <div>
                      <span className="font-medium text-forest">
                        {money(p.amount, p.currency)}
                      </span>
                      <span className="text-forest/45"> · {p.method}</span>
                      <div className="text-xs text-forest/45 mt-0.5">
                        {formatDisplayDate(p.date)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </div>
                    </div>
                    <span
                      className={`text-[10px] uppercase tracking-wide self-start rounded-full px-2 py-0.5 ${
                        p.status === "paid"
                          ? "bg-sage-muted text-forest"
                          : p.status === "failed"
                            ? "bg-red-50 text-red-700"
                            : "bg-peach-soft text-forest"
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                ))}
                {clientPays.length === 0 && (
                  <p className="text-sm text-forest/40">No payments yet.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or add a client.</p>
          )}
        </div>
      </div>

      {/* Client modal */}
      <Modal
        open={clientModal}
        title={editingClient ? "Edit client" : "New client"}
        onClose={() => setClientModal(false)}
      >
        <form onSubmit={saveClient} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Name</label>
            <input
              className="input-field"
              placeholder="Name"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Email</label>
            <input
              className="input-field"
              type="email"
              placeholder="Email"
              value={clientForm.email}
              onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Company</label>
            <input
              className="input-field"
              placeholder="Company"
              value={clientForm.company}
              onChange={(e) => setClientForm({ ...clientForm, company: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Notes"
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setClientModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Subscription modal */}
      <Modal open={subModal} title="Add subscription" onClose={() => setSubModal(false)}>
        <form onSubmit={saveSub} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Client</label>
            <SearchableSelect
              options={[
                { value: "", label: "Client…" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={subForm.clientId}
              onChange={(clientId) => setSubForm({ ...subForm, clientId })}
              placeholder="Client…"
              aria-label="Client"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Live product</label>
            <SearchableSelect
              options={[
                { value: "", label: "Live product…" },
                ...liveProjects.map((p) => ({ value: p.id, label: p.name })),
              ]}
              value={subForm.projectId}
              onChange={(projectId) => setSubForm({ ...subForm, projectId })}
              placeholder="Live product…"
              aria-label="Live product"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Plan</label>
            <input
              className="input-field"
              placeholder="Plan name"
              value={subForm.plan}
              onChange={(e) => setSubForm({ ...subForm, plan: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Status</label>
              <SearchableSelect
                options={[
                  { value: "active", label: "Active" },
                  { value: "trial", label: "Trial" },
                  { value: "past_due", label: "Past due" },
                  { value: "cancelled", label: "Cancelled" },
                ]}
                value={subForm.status}
                onChange={(status) =>
                  setSubForm({
                    ...subForm,
                    status: status as SubscriptionStatus,
                  })
                }
                aria-label="Subscription status"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Billing</label>
              <SearchableSelect
                options={[
                  { value: "monthly", label: "Monthly" },
                  { value: "yearly", label: "Yearly" },
                  { value: "custom", label: "Custom" },
                ]}
                value={subForm.billingPeriod}
                onChange={(billingPeriod) =>
                  setSubForm({
                    ...subForm,
                    billingPeriod: billingPeriod as BillingPeriod,
                  })
                }
                aria-label="Billing period"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Start</label>
              <input
                type="date"
                className="input-field"
                value={subForm.startDate}
                onChange={(e) => setSubForm({ ...subForm, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Renewal</label>
              <input
                type="date"
                className="input-field"
                value={subForm.renewalDate}
                onChange={(e) => setSubForm({ ...subForm, renewalDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Amount</label>
              <input
                type="number"
                className="input-field"
                placeholder="Amount"
                value={subForm.amount}
                onChange={(e) => setSubForm({ ...subForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Currency</label>
              <input
                className="input-field"
                placeholder="Currency"
                value={subForm.currency}
                onChange={(e) => setSubForm({ ...subForm, currency: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</label>
            <textarea
              className="input-field min-h-[70px]"
              placeholder="Notes"
              value={subForm.notes}
              onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setSubModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Payment modal */}
      <Modal open={payModal} title="Add payment" onClose={() => setPayModal(false)}>
        <form onSubmit={savePay} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Client</label>
            <SearchableSelect
              options={[
                { value: "", label: "Client…" },
                ...clients.map((c) => ({ value: c.id, label: c.name })),
              ]}
              value={payForm.clientId}
              onChange={(clientId) => setPayForm({ ...payForm, clientId })}
              placeholder="Client…"
              aria-label="Client"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Subscription</label>
            <SearchableSelect
              options={[
                { value: "", label: "No subscription link" },
                ...subscriptions
                  .filter((s) => !payForm.clientId || s.clientId === payForm.clientId)
                  .map((s) => ({ value: s.id, label: s.plan })),
              ]}
              value={payForm.subscriptionId}
              onChange={(subscriptionId) =>
                setPayForm({ ...payForm, subscriptionId })
              }
              placeholder="No subscription link"
              aria-label="Subscription"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Amount</label>
              <input
                type="number"
                className="input-field"
                placeholder="Amount"
                value={payForm.amount}
                onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Currency</label>
              <input
                className="input-field"
                placeholder="Currency"
                value={payForm.currency}
                onChange={(e) => setPayForm({ ...payForm, currency: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Date</label>
              <input
                type="date"
                className="input-field"
                value={payForm.date}
                onChange={(e) => setPayForm({ ...payForm, date: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Method</label>
              <input
                className="input-field"
                placeholder="Method"
                value={payForm.method}
                onChange={(e) => setPayForm({ ...payForm, method: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Status</label>
            <SearchableSelect
              options={[
                { value: "paid", label: "Paid" },
                { value: "pending", label: "Pending" },
                { value: "failed", label: "Failed" },
                { value: "refunded", label: "Refunded" },
              ]}
              value={payForm.status}
              onChange={(status) =>
                setPayForm({ ...payForm, status: status as PaymentStatus })
              }
              aria-label="Payment status"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Reference</label>
            <input
              className="input-field"
              placeholder="Reference"
              value={payForm.reference}
              onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</label>
            <textarea
              className="input-field min-h-[70px]"
              placeholder="Notes"
              value={payForm.notes}
              onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setPayModal(false)}>
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
