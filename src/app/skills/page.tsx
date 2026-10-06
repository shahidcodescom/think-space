"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { SearchableSelect } from "@/components/SearchableSelect";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import {
  PencilIcon,
  PlusIcon,
  SkillsIcon,
  TrashIcon,
} from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import {
  Skill,
  SkillProficiency,
  SkillStatus,
} from "@/lib/types";

const STATUSES: SkillStatus[] = ["have", "learning", "planned"];
const PROFICIENCIES: SkillProficiency[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];
const CATEGORIES = [
  "Engineering",
  "Product",
  "Design",
  "Career",
  "Soft skills",
  "Other",
];

type FormState = {
  name: string;
  category: string;
  status: SkillStatus;
  proficiency: SkillProficiency;
  priority: string;
  notes: string;
  targetDate: string;
};

const emptyForm: FormState = {
  name: "",
  category: "Engineering",
  status: "planned",
  proficiency: "intermediate",
  priority: "3",
  notes: "",
  targetDate: "",
};

function statusLabel(s: SkillStatus) {
  if (s === "have") return "Have";
  if (s === "learning") return "Learning";
  return "Planned";
}

function statusTone(s: SkillStatus) {
  if (s === "have") return "bg-sage-muted text-forest";
  if (s === "learning") return "bg-peach-soft text-forest";
  return "bg-teal-soft text-forest";
}

export default function SkillsPage() {
  const confirm = useConfirm();
  const [items, setItems] = useState<Skill[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/skills");
    const data: Skill[] = await res.json();
    setItems(data);
    setSelectedId((prev) => {
      if (prev && data.some((s) => s.id === prev)) return prev;
      return data[0]?.id || null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = useMemo(() => {
    const set = new Set([
      ...CATEGORIES,
      ...items.map((s) => s.category).filter(Boolean),
    ]);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter) list = list.filter((s) => s.category === categoryFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) =>
        `${s.name} ${s.category} ${s.notes}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, categoryFilter, query]);

  const have = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "have")
        .sort((a, b) => a.name.localeCompare(b.name)),
    [filtered]
  );

  const toLearn = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "learning" || s.status === "planned")
        .sort((a, b) => {
          const pa = a.priority ?? 5;
          const pb = b.priority ?? 5;
          if (pa !== pb) return pa - pb;
          return a.name.localeCompare(b.name);
        }),
    [filtered]
  );

  const selected = items.find((s) => s.id === selectedId) || null;

  function openCreate(status: SkillStatus = "planned") {
    setEditing(null);
    setForm({ ...emptyForm, status });
    setError(null);
    setModalOpen(true);
  }

  function openEdit(s: Skill) {
    setEditing(s);
    setForm({
      name: s.name,
      category: s.category,
      status: s.status,
      proficiency: s.proficiency || "intermediate",
      priority: String(s.priority ?? 3),
      notes: s.notes,
      targetDate: s.targetDate || "",
    });
    setError(null);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      category: form.category,
      status: form.status,
      notes: form.notes,
      targetDate: form.targetDate,
    };
    if (form.status === "have" || form.status === "learning") {
      payload.proficiency = form.proficiency;
    }
    if (form.status === "learning" || form.status === "planned") {
      payload.priority = Number(form.priority) || 3;
    }
    const res = editing
      ? await fetch(`/api/skills/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/api/skills", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setError(err.error || "Save failed");
      return;
    }
    const saved: Skill = await res.json();
    setModalOpen(false);
    await load();
    setSelectedId(saved.id);
    setMobileDetail(true);
  }

  async function remove(s: Skill) {
    if (!(await confirm({ title: "Delete skill?", message: `Delete “${s.name}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/skills/${s.id}`, { method: "DELETE" });
    if (selectedId === s.id) setSelectedId(null);
    setMobileDetail(false);
    await load();
  }

  async function markHave(s: Skill) {
    setBusyId(s.id);
    await fetch(`/api/skills/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_have" }),
    });
    setBusyId(null);
    await load();
  }

  async function markLearn(s: Skill, status: "learning" | "planned" = "learning") {
    setBusyId(s.id);
    await fetch(`/api/skills/${s.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_learn", status }),
    });
    setBusyId(null);
    await load();
  }

  function selectItem(s: Skill) {
    setSelectedId(s.id);
    setMobileDetail(true);
  }

  const showDetail = mobileDetail;

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sage-muted text-forest">
            <SkillsIcon size={22} />
          </div>
          <div>
            <h1 className="font-serif text-2xl text-forest md:text-3xl">
              Skills
            </h1>
            <p className="text-sm text-forest/60">
              What you have &amp; what to learn
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={() => openCreate("have")}>
            + Have
          </button>
          <button className="btn-primary" onClick={() => openCreate("planned")}>
            <PlusIcon size={16} /> To learn
          </button>
        </div>
      </header>

      <div className="flex flex-wrap gap-2">
        <input
          className="input-field min-w-[10rem] flex-1"
          placeholder="Search skills…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <SearchableSelect
          className="w-44"
          options={[
            { value: "", label: "All categories" },
            ...categories.map((c) => ({ value: c, label: c })),
          ]}
          value={categoryFilter}
          onChange={setCategoryFilter}
          placeholder="All categories"
          aria-label="Filter by category"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <div
          className={`flex min-h-0 w-full flex-col gap-4 overflow-y-auto pb-4 lg:w-[48%] ${
            showDetail ? "hidden lg:flex" : "flex"
          }`}
        >
          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-forest/50">
                Skills I have · {have.length}
              </h2>
            </div>
            <div className="space-y-2">
              {have.length === 0 && (
                <p className="rounded-xl border border-dashed border-forest/15 bg-white p-4 text-center text-sm text-forest/45">
                  No skills marked as have yet.
                </p>
              )}
              {have.map((s) => (
                <SkillRow
                  key={s.id}
                  s={s}
                  active={selectedId === s.id}
                  onSelect={() => selectItem(s)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-forest/50">
                Skills to learn · {toLearn.length}
              </h2>
            </div>
            <div className="space-y-2">
              {toLearn.length === 0 && (
                <p className="rounded-xl border border-dashed border-forest/15 bg-white p-4 text-center text-sm text-forest/45">
                  Nothing on the learning list.
                </p>
              )}
              {toLearn.map((s) => (
                <SkillRow
                  key={s.id}
                  s={s}
                  active={selectedId === s.id}
                  onSelect={() => selectItem(s)}
                />
              ))}
            </div>
          </section>
        </div>

        <div
          className={`min-h-0 flex-1 ${
            showDetail ? "flex" : "hidden lg:flex"
          } flex-col rounded-2xl border border-forest/10 bg-white p-4 shadow-sm md:p-6`}
        >
          <div className="mb-3 lg:hidden">
            <MobileBackButton
              onClick={() => setMobileDetail(false)}
              label="Skills"
            />
          </div>
          {selected ? (
            <>
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
                    {selected.name}
                  </h2>
                  <p className="text-sm text-forest/60">{selected.category}</p>
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

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <Field
                  label="Proficiency"
                  value={selected.proficiency || "—"}
                />
                <Field
                  label="Priority"
                  value={
                    selected.priority != null ? String(selected.priority) : "—"
                  }
                />
                <Field
                  label="Target"
                  value={
                    selected.targetDate
                      ? formatDisplayDate(selected.targetDate)
                      : "—"
                  }
                />
                <Field label="Status" value={statusLabel(selected.status)} />
              </div>

              {selected.notes && (
                <p className="mt-4 rounded-xl bg-cream/80 p-3 text-sm text-forest/80">
                  {selected.notes}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                {selected.status !== "have" && (
                  <button
                    className="btn-primary"
                    disabled={busyId === selected.id}
                    onClick={() => markHave(selected)}
                  >
                    Move to Have
                  </button>
                )}
                {selected.status === "have" && (
                  <button
                    className="btn-ghost"
                    disabled={busyId === selected.id}
                    onClick={() => markLearn(selected, "learning")}
                  >
                    Move to Learning
                  </button>
                )}
                {selected.status === "planned" && (
                  <button
                    className="btn-ghost"
                    disabled={busyId === selected.id}
                    onClick={() => markLearn(selected, "learning")}
                  >
                    Start learning
                  </button>
                )}
                {selected.status === "learning" && (
                  <button
                    className="btn-ghost"
                    disabled={busyId === selected.id}
                    onClick={() => markLearn(selected, "planned")}
                  >
                    Park as planned
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="m-auto text-sm text-forest/50">
              Select a skill to view details.
            </p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit skill" : "New skill"}
      >
        <form onSubmit={save} className="space-y-3">
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Name</span>
            <input
              className="input-field w-full"
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Category</span>
              <input
                className="input-field w-full"
                list="skill-cats"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
              <datalist id="skill-cats">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Status</span>
              <SearchableSelect
                options={STATUSES.map((s) => ({
                  value: s,
                  label: statusLabel(s),
                }))}
                value={form.status}
                onChange={(status) =>
                  setForm((f) => ({
                    ...f,
                    status: status as SkillStatus,
                  }))
                }
                aria-label="Status"
                required
              />
            </label>
          </div>
          {(form.status === "have" || form.status === "learning") && (
            <label className="block text-sm">
              <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Proficiency</span>
              <SearchableSelect
                options={PROFICIENCIES.map((p) => ({ value: p, label: p }))}
                value={form.proficiency}
                onChange={(proficiency) =>
                  setForm((f) => ({
                    ...f,
                    proficiency: proficiency as SkillProficiency,
                  }))
                }
                aria-label="Proficiency"
              />
            </label>
          )}
          {(form.status === "learning" || form.status === "planned") && (
            <>
              <label className="block text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">
                  Priority (1 high – 5 low)
                </span>
                <input
                  className="input-field w-full"
                  type="number"
                  min={1}
                  max={5}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                />
              </label>
              <label className="block text-sm">
                <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Target date</span>
                <input
                  className="input-field w-full"
                  type="date"
                  value={form.targetDate}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                />
              </label>
            </>
          )}
          <label className="block text-sm">
            <span className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Notes</span>
            <textarea
              className="input-field min-h-[4rem] w-full"
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

function SkillRow({
  s,
  active,
  onSelect,
}: {
  s: Skill;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-3 text-left transition ${
        active
          ? "border-sage bg-sage-muted"
          : "border-forest/5 bg-white hover:border-sage/60"
      }`}
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${statusTone(
              s.status
            )}`}
          >
            {statusLabel(s.status)}
          </span>
          <span className="truncate font-medium text-forest">{s.name}</span>
        </div>
        <p className="mt-0.5 truncate text-xs text-forest/50">
          {s.category}
          {s.proficiency ? ` · ${s.proficiency}` : ""}
          {s.priority != null ? ` · P${s.priority}` : ""}
        </p>
      </div>
    </button>
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
