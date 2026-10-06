"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { SearchableSelect } from "@/components/SearchableSelect";
import {
  PencilIcon,
  PlusIcon,
  ProjectIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import { Project, ProjectStatus } from "@/lib/types";

type FormState = {
  name: string;
  description: string;
  status: ProjectStatus;
  url: string;
  tags: string;
  startedAt: string;
  releasedAt: string;
  notes: string;
};

const emptyForm: FormState = {
  name: "",
  description: "",
  status: "in_progress",
  url: "",
  tags: "",
  startedAt: "",
  releasedAt: "",
  notes: "",
};

export default function ProjectsPage() {
  const confirm = useConfirm();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/projects");
    const data: Project[] = await res.json();
    setProjects(data);
    setSelectedId((prev) => {
      if (prev && data.some((p) => p.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const inProgress = useMemo(
    () => projects.filter((p) => p.status === "in_progress"),
    [projects]
  );
  const live = useMemo(
    () => projects.filter((p) => p.status === "live"),
    [projects]
  );
  const selected = projects.find((p) => p.id === selectedId) || null;

  function openCreate(status: ProjectStatus = "in_progress") {
    setEditing(null);
    setForm({
      ...emptyForm,
      status,
      startedAt: new Date().toISOString().slice(0, 10),
      releasedAt: status === "live" ? new Date().toISOString().slice(0, 10) : "",
    });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(project: Project) {
    setEditing(project);
    setForm({
      name: project.name,
      description: project.description,
      status: project.status,
      url: project.url,
      tags: project.tags.join(", "),
      startedAt: project.startedAt,
      releasedAt: project.releasedAt,
      notes: project.notes,
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const body = { ...form };
    if (editing) {
      const res = await fetch(`/api/projects/${editing.id}`, {
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
      setSelectedId(updated.id);
    } else {
      const res = await fetch("/api/projects", {
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

  async function remove(project: Project) {
    if (!(await confirm({ title: "Delete project?", message: `Delete project “${project.name}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    if (selectedId === project.id) setSelectedId(null);
    await load();
  }

  async function setStatus(project: Project, status: ProjectStatus) {
    setBusyId(project.id);
    try {
      const res = await fetch(`/api/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          releasedAt:
            status === "live"
              ? project.releasedAt || new Date().toISOString().slice(0, 10)
              : project.releasedAt,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProjects((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Projects.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Builds in progress — and products already live.
          </p>
        </div>
        <button className="btn-primary shrink-0" onClick={() => openCreate("in_progress")}>
          <PlusIcon size={16} /> Add project
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[1fr_1fr_320px] gap-4">
        <Section
          title="In progress"
          subtitle="Active builds you can still shape."
          tone="bg-sage-muted/50"
          items={inProgress}
          selectedId={selectedId}
          busyId={busyId}
          empty="Nothing in progress — start something calm."
          onSelect={setSelectedId}
          onMarkLive={(p) => setStatus(p, "live")}
          onMarkProgress={(p) => setStatus(p, "in_progress")}
          onAdd={() => openCreate("in_progress")}
        />

        <Section
          title="Live / Released"
          subtitle="Shipped products — kept separate on purpose."
          tone="bg-peach-soft/60"
          items={live}
          selectedId={selectedId}
          busyId={busyId}
          empty="No live products yet."
          onSelect={setSelectedId}
          onMarkLive={(p) => setStatus(p, "live")}
          onMarkProgress={(p) => setStatus(p, "in_progress")}
          onAdd={() => openCreate("live")}
        />

        <div className="card p-5 xl:max-h-[75vh] overflow-y-auto scroll-thin">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-2 mb-3">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.name}</h2>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex gap-1">
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
              <p className="text-sm text-forest/75 mb-4">{selected.description || "—"}</p>
              <dl className="space-y-2 text-sm mb-4">
                <Row label="Started" value={selected.startedAt ? formatDisplayDate(selected.startedAt) : "—"} />
                <Row
                  label="Released"
                  value={selected.releasedAt ? formatDisplayDate(selected.releasedAt) : "—"}
                />
                <Row
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
                <div className="rounded-xl bg-cream-soft border border-forest/5 px-3 py-2.5 mb-4">
                  <div className="text-[10px] uppercase tracking-wide text-forest/45 mb-1">
                    Notes
                  </div>
                  <p className="text-sm text-forest/75 whitespace-pre-wrap">{selected.notes}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {selected.status === "in_progress" ? (
                  <button
                    className="btn-primary"
                    disabled={busyId === selected.id}
                    onClick={() => setStatus(selected, "live")}
                  >
                    Mark live / released
                  </button>
                ) : (
                  <button
                    className="btn-ghost"
                    disabled={busyId === selected.id}
                    onClick={() => setStatus(selected, "in_progress")}
                  >
                    Move to in progress
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-forest/40">Select a project.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit project" : "New project"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Name</label>
            <input
              className="input-field"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Description</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Status</label>
            <SearchableSelect
              options={[
                { value: "in_progress", label: "In progress" },
                { value: "live", label: "Live / Released" },
              ]}
              value={form.status}
              onChange={(status) =>
                setForm({ ...form, status: status as ProjectStatus })
              }
              aria-label="Status"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">URL</label>
            <input
              className="input-field"
              placeholder="Optional"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Started</label>
              <input
                type="date"
                className="input-field"
                value={form.startedAt}
                onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Released</label>
              <input
                type="date"
                className="input-field"
                value={form.releasedAt}
                onChange={(e) => setForm({ ...form, releasedAt: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Tags</label>
            <input
              className="input-field"
              placeholder="Comma separated"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
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

function Section({
  title,
  subtitle,
  tone,
  items,
  selectedId,
  busyId,
  empty,
  onSelect,
  onMarkLive,
  onMarkProgress,
  onAdd,
}: {
  title: string;
  subtitle: string;
  tone: string;
  items: Project[];
  selectedId: string | null;
  busyId: string | null;
  empty: string;
  onSelect: (id: string) => void;
  onMarkLive: (p: Project) => void;
  onMarkProgress: (p: Project) => void;
  onAdd: () => void;
}) {
  return (
    <section className={`card p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h2 className="font-serif text-xl text-forest">{title}</h2>
          <p className="text-xs text-forest/50 mt-0.5">{subtitle}</p>
        </div>
        <button className="btn-ghost text-xs" onClick={onAdd}>
          <PlusIcon size={14} /> Add
        </button>
      </div>
      <div className="space-y-2 max-h-[60vh] overflow-y-auto scroll-thin">
        {items.map((p) => (
          <div
            key={p.id}
            className={`rounded-xl bg-white/90 border px-3 py-3 transition-colors ${
              selectedId === p.id ? "border-sage shadow-soft" : "border-forest/5"
            }`}
          >
            <button className="w-full text-left" onClick={() => onSelect(p.id)}>
              <div className="flex items-center gap-2">
                <ProjectIcon size={16} className="text-forest/40 shrink-0" />
                <span className="text-sm font-semibold text-forest">{p.name}</span>
              </div>
              <p className="text-xs text-forest/50 mt-1 line-clamp-2 pl-6">
                {p.description || "No description"}
              </p>
            </button>
            <div className="flex flex-wrap gap-2 mt-2 pl-6">
              {p.status === "in_progress" ? (
                <button
                  className="text-[11px] font-medium text-forest bg-sage-light/80 px-2 py-1 rounded-lg hover:bg-sage-light disabled:opacity-50"
                  disabled={busyId === p.id}
                  onClick={() => onMarkLive(p)}
                >
                  Mark live
                </button>
              ) : (
                <button
                  className="text-[11px] font-medium text-forest/70 bg-cream px-2 py-1 rounded-lg hover:bg-sage-muted disabled:opacity-50"
                  disabled={busyId === p.id}
                  onClick={() => onMarkProgress(p)}
                >
                  Move to in progress
                </button>
              )}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-sm text-forest/40 px-1 py-3">{empty}</p>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  const live = status === "live";
  return (
    <span
      className={`inline-block mt-2 text-[10px] uppercase tracking-wide rounded-full px-2 py-0.5 ${
        live ? "bg-peach-soft text-forest" : "bg-sage-muted text-forest"
      }`}
    >
      {live ? "Live / Released" : "In progress"}
    </span>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <dt className="w-20 shrink-0 text-[10px] uppercase tracking-wide text-forest/45 pt-0.5">
        {label}
      </dt>
      <dd className="text-forest/80">{value}</dd>
    </div>
  );
}
