"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { MobileBackButton } from "@/components/MobileBackButton";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SafeHtml } from "@/components/SafeHtml";
import {
  JobsIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/Icons";
import {
  JOB_STATUSES,
  JobApplication,
  JobStatus,
} from "@/lib/types";

type ViewMode = "board" | "list";

type FormState = {
  company: string;
  role: string;
  location: string;
  remote: boolean;
  sourceUrl: string;
  jdHtml: string;
  status: JobStatus;
  appliedDate: string;
  nextInterviewAt: string;
  salaryNotes: string;
  contacts: string;
  notes: string;
  linkToCalendar: boolean;
};

const emptyForm: FormState = {
  company: "",
  role: "",
  location: "",
  remote: false,
  sourceUrl: "",
  jdHtml: "",
  status: "applied",
  appliedDate: new Date().toISOString().slice(0, 10),
  nextInterviewAt: "",
  salaryNotes: "",
  contacts: "",
  notes: "",
  linkToCalendar: false,
};

function statusLabel(s: JobStatus) {
  return s.replace(/_/g, " ");
}

function statusTone(s: JobStatus) {
  if (s === "accepted" || s === "job_offer") return "bg-sage-muted text-forest";
  if (s === "rejected" || s === "failed" || s === "abandoned")
    return "bg-red-50 text-forest";
  if (s.includes("round") || s === "scheduled") return "bg-peach-soft text-forest";
  if (s === "applied" || s === "enquired") return "bg-teal-soft text-forest";
  return "bg-cream text-forest";
}

function toLocalInput(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(local: string) {
  if (!local) return "";
  return new Date(local).toISOString();
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<JobApplication[]>([]);
  const [view, setView] = useState<ViewMode>("board");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<JobApplication | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/jobs");
    const data: JobApplication[] = await res.json();
    setJobs(data);
    setSelectedId((prev) => {
      if (prev && data.some((j) => j.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let list = jobs;
    if (statusFilter) list = list.filter((j) => j.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((j) =>
        `${j.company} ${j.role} ${j.location} ${j.notes} ${j.contacts}`
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [jobs, statusFilter, query]);

  const byStatus = useMemo(() => {
    const map: Record<string, JobApplication[]> = {};
    for (const s of JOB_STATUSES) map[s] = [];
    for (const j of filtered) {
      if (!map[j.status]) map[j.status] = [];
      map[j.status].push(j);
    }
    return map;
  }, [filtered]);

  const selected = jobs.find((j) => j.id === selectedId) || null;

  function openCreate(status: JobStatus = "applied") {
    setEditing(null);
    setForm({ ...emptyForm, status });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(j: JobApplication) {
    setEditing(j);
    setForm({
      company: j.company,
      role: j.role,
      location: j.location,
      remote: j.remote,
      sourceUrl: j.sourceUrl,
      jdHtml: j.jdHtml,
      status: j.status,
      appliedDate: j.appliedDate,
      nextInterviewAt: toLocalInput(j.nextInterviewAt),
      salaryNotes: j.salaryNotes,
      contacts: j.contacts,
      notes: j.notes,
      linkToCalendar: false,
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.company.trim()) {
      setError("Company is required");
      return;
    }
    const payload = {
      company: form.company.trim(),
      role: form.role.trim(),
      location: form.location,
      remote: form.remote,
      sourceUrl: form.sourceUrl,
      jdHtml: form.jdHtml,
      status: form.status,
      appliedDate: form.appliedDate,
      nextInterviewAt: fromLocalInput(form.nextInterviewAt),
      salaryNotes: form.salaryNotes,
      contacts: form.contacts,
      notes: form.notes,
      linkToCalendar: form.linkToCalendar,
    };
    const res = editing
      ? await fetch(`/api/jobs/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: JobApplication = await res.json();
    setModalOpen(false);
    await load();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(j: JobApplication) {
    if (!confirm(`Delete application at ${j.company}?`)) return;
    await fetch(`/api/jobs/${j.id}`, { method: "DELETE" });
    if (selectedId === j.id) setSelectedId(null);
    setMobileDetail(false);
    await load();
  }

  async function moveStatus(j: JobApplication, status: JobStatus) {
    await fetch(`/api/jobs/${j.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  }

  async function uploadResume(j: JobApplication, file: File) {
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/jobs/${j.id}/resume`, {
      method: "POST",
      body: fd,
    });
    setUploading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.error || "Upload failed");
      return;
    }
    await load();
  }

  async function deleteResume(j: JobApplication) {
    if (!confirm("Remove resume file?")) return;
    await fetch(`/api/jobs/${j.id}/resume`, { method: "DELETE" });
    await load();
  }

  function selectJob(j: JobApplication) {
    setSelectedId(j.id);
    setMobileDetail(true);
  }

  const showDetail = mobileDetail;
  const boardColumns = statusFilter
    ? JOB_STATUSES.filter((s) => s === statusFilter)
    : JOB_STATUSES.filter((s) => (byStatus[s] || []).length > 0 || s === "applied");

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <JobsIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">
              Job Hunt
            </h1>
            <p className="text-sm text-forest/60">
              Applications, interviews &amp; offers
            </p>
          </div>
        </div>
        <button className="btn-primary" onClick={() => openCreate("applied")}>
          <PlusIcon size={16} /> Application
        </button>
      </header>

      <div className="flex flex-wrap gap-2">
        <button
          className={`btn-ghost text-sm ${view === "board" ? "bg-sage-muted" : ""}`}
          onClick={() => setView("board")}
        >
          Board
        </button>
        <button
          className={`btn-ghost text-sm ${view === "list" ? "bg-sage-muted" : ""}`}
          onClick={() => setView("list")}
        >
          List
        </button>
        <select
          className="input max-w-[12rem]"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {statusLabel(s)}
            </option>
          ))}
        </select>
        <input
          className="input min-w-[10rem] flex-1"
          placeholder="Search company or role…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div
          className={`flex min-h-0 w-full flex-col ${
            showDetail ? "hidden lg:flex" : "flex"
          } ${view === "board" ? "lg:w-[62%]" : "lg:w-[44%]"}`}
        >
          {view === "board" ? (
            <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
              {boardColumns.map((status) => (
                <div
                  key={status}
                  className="flex w-64 shrink-0 flex-col rounded-2xl border border-forest/10 bg-white/80"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-forest/5 px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-forest/55">
                      {statusLabel(status)}
                    </p>
                    <span className="text-xs text-forest/40">
                      {(byStatus[status] || []).length}
                    </span>
                  </div>
                  <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-2">
                    {(byStatus[status] || []).map((j) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() => selectJob(j)}
                        className={`w-full rounded-xl border px-3 py-2 text-left ${
                          selectedId === j.id
                            ? "border-sage bg-sage-muted"
                            : "border-forest/5 bg-cream/60 hover:border-sage/50"
                        }`}
                      >
                        <p className="font-medium text-forest">{j.company}</p>
                        <p className="truncate text-xs text-forest/55">{j.role}</p>
                        {j.nextInterviewAt && (
                          <p className="mt-1 text-[10px] text-forest/45">
                            Interview{" "}
                            {new Date(j.nextInterviewAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="w-full rounded-lg border border-dashed border-forest/15 py-2 text-xs text-forest/45 hover:bg-cream"
                      onClick={() => openCreate(status)}
                    >
                      + Add
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pb-4">
              {filtered.length === 0 && (
                <p className="rounded-xl border border-dashed border-forest/15 bg-white p-6 text-center text-sm text-forest/50">
                  No applications yet.
                </p>
              )}
              {filtered.map((j) => (
                <button
                  key={j.id}
                  type="button"
                  onClick={() => selectJob(j)}
                  className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left ${
                    selectedId === j.id
                      ? "border-sage bg-sage-muted"
                      : "border-forest/5 bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(
                          j.status
                        )}`}
                      >
                        {statusLabel(j.status)}
                      </span>
                      <span className="font-medium text-forest">{j.company}</span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-forest/50">
                      {j.role} · {j.remote ? "Remote" : j.location || "—"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-forest/40">
                    {j.appliedDate}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
        >
          <div className="mb-3 lg:hidden">
            <MobileBackButton
              onClick={() => setMobileDetail(false)}
              label="Jobs"
            />
          </div>
          {selected ? (
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(
                      selected.status
                    )}`}
                  >
                    {statusLabel(selected.status)}
                  </span>
                  <h2 className="mt-1 font-serif text-2xl text-forest">
                    {selected.company}
                  </h2>
                  <p className="text-sm text-forest/60">{selected.role}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost"
                    onClick={() => openEdit(selected)}
                  >
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

              <label className="mt-4 block text-sm">
                <span className="mb-1 block text-forest/55">Move status</span>
                <select
                  className="input w-full max-w-xs"
                  value={selected.status}
                  onChange={(e) =>
                    moveStatus(selected, e.target.value as JobStatus)
                  }
                >
                  {JOB_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {statusLabel(s)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field
                  label="Location"
                  value={
                    selected.remote
                      ? `Remote${selected.location ? ` · ${selected.location}` : ""}`
                      : selected.location || "—"
                  }
                />
                <Field label="Applied" value={selected.appliedDate || "—"} />
                <Field
                  label="Next interview"
                  value={
                    selected.nextInterviewAt
                      ? new Date(selected.nextInterviewAt).toLocaleString(
                          "en-IN",
                          { dateStyle: "medium", timeStyle: "short" }
                        )
                      : "—"
                  }
                />
                <Field label="Salary" value={selected.salaryNotes || "—"} />
              </div>

              {selected.sourceUrl && (
                <a
                  href={selected.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-block text-sm text-forest underline-offset-2 hover:underline"
                >
                  Source / posting
                </a>
              )}

              {selected.contacts && (
                <p className="mt-3 text-sm text-forest/70">
                  <span className="text-forest/45">Contacts · </span>
                  {selected.contacts}
                </p>
              )}

              {selected.notes && (
                <p className="mt-3 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                  {selected.notes}
                </p>
              )}

              {selected.jdHtml && (
                <div className="mt-4">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-forest/45">
                    Job description
                  </p>
                  <div className="rounded-xl border border-forest/5 bg-cream/40 p-3 text-sm">
                    <SafeHtml html={selected.jdHtml} />
                  </div>
                </div>
              )}

              {/* Resume */}
              <div className="mt-4 rounded-xl border border-forest/10 bg-cream/50 p-4">
                <p className="text-sm font-medium text-forest">Resume</p>
                <p className="mt-0.5 text-xs text-forest/50">
                  Optional when status is applied (stored under data/uploads/resumes/)
                </p>
                {selected.resumePath ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <a
                      className="btn-ghost text-sm"
                      href={`/api/jobs/${selected.id}/resume`}
                    >
                      Download · {selected.resumeName || "resume"}
                    </a>
                    <label className="btn-ghost cursor-pointer text-sm">
                      Replace
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
                        disabled={uploading}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) uploadResume(selected, f);
                          e.target.value = "";
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      className="btn-ghost text-sm text-red-700"
                      onClick={() => deleteResume(selected)}
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="btn-primary mt-2 inline-flex cursor-pointer text-sm">
                    {uploading ? "Uploading…" : "Upload resume"}
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadResume(selected, f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>

              {selected.linkedCalendarEventId && (
                <Link
                  href="/calendar"
                  className="mt-3 inline-block text-sm text-forest underline-offset-2 hover:underline"
                >
                  Linked calendar event · {selected.linkedCalendarEventId}
                </Link>
              )}
            </div>
          ) : (
            <p className="m-auto text-sm text-forest/50">
              Select an application to view details.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit application" : "New application"}
      >
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Company</span>
              <input
                className="input w-full"
                required
                value={form.company}
                onChange={(e) =>
                  setForm((f) => ({ ...f, company: e.target.value }))
                }
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Role / title</span>
              <input
                className="input w-full"
                required
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Location</span>
              <input
                className="input w-full"
                value={form.location}
                onChange={(e) =>
                  setForm((f) => ({ ...f, location: e.target.value }))
                }
              />
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-forest">
              <input
                type="checkbox"
                checked={form.remote}
                onChange={(e) =>
                  setForm((f) => ({ ...f, remote: e.target.checked }))
                }
              />
              Remote
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Source URL</span>
            <input
              className="input w-full"
              value={form.sourceUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, sourceUrl: e.target.value }))
              }
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Status</span>
              <select
                className="input w-full"
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as JobStatus,
                  }))
                }
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-forest/70">Applied date</span>
              <input
                className="input w-full"
                type="date"
                value={form.appliedDate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, appliedDate: e.target.value }))
                }
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Next interview</span>
            <input
              className="input w-full"
              type="datetime-local"
              value={form.nextInterviewAt}
              onChange={(e) =>
                setForm((f) => ({ ...f, nextInterviewAt: e.target.value }))
              }
            />
          </label>
          {form.nextInterviewAt && (
            <label className="flex items-center gap-2 text-sm text-forest">
              <input
                type="checkbox"
                checked={form.linkToCalendar}
                onChange={(e) =>
                  setForm((f) => ({ ...f, linkToCalendar: e.target.checked }))
                }
              />
              Also create Calendar interview event
            </label>
          )}
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Salary notes</span>
            <input
              className="input w-full"
              value={form.salaryNotes}
              onChange={(e) =>
                setForm((f) => ({ ...f, salaryNotes: e.target.value }))
              }
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Contacts</span>
            <input
              className="input w-full"
              value={form.contacts}
              onChange={(e) =>
                setForm((f) => ({ ...f, contacts: e.target.value }))
              }
            />
          </label>
          <div className="text-sm">
            <span className="mb-1 block text-forest/70">Job description</span>
            <RichTextEditor
              value={form.jdHtml}
              onChange={(html) => setForm((f) => ({ ...f, jdHtml: html }))}
              placeholder="Paste or write the JD…"
            />
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-forest/70">Notes</span>
            <textarea
              className="input min-h-[3.5rem] w-full"
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

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-cream/70 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-forest/45">{label}</p>
      <p className="mt-0.5 text-forest">{value}</p>
    </div>
  );
}
