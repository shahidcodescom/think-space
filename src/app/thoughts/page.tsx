"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionItems } from "@/components/ActionItems";
import { RichTextEditor } from "@/components/RichTextEditor";
import { LinkedNotes } from "@/components/LinkedNotes";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { Note, Task, Thought } from "@/lib/types";

export default function ThoughtsPage() {
  const confirm = useConfirm();
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Thought | null>(null);
  const [noteModal, setNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", content: "<p></p>" });
  const [noteEditorKey, setNoteEditorKey] = useState(0);
  const [form, setForm] = useState({ title: "", content: "" });

  const load = useCallback(async () => {
    const [thRes, nRes, tRes] = await Promise.all([
      fetch("/api/thoughts"),
      fetch("/api/notes"),
      fetch("/api/tasks"),
    ]);
    const data: Thought[] = await thRes.json();
    setThoughts(data);
    setNotes(await nRes.json());
    setTasks(await tRes.json());
    setSelectedId((prev) => prev || data[0]?.id || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = thoughts.find((t) => t.id === selectedId) || null;
  const linkedNotes = selected
    ? notes.filter((n) => selected.linkedNoteIds.includes(n.id))
    : [];
  const actionTasks = selected
    ? tasks.filter((t) => t.thoughtId === selected.id)
    : [];

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "" });
    setModalOpen(true);
  }

  function openEdit(t: Thought) {
    setEditing(t);
    setForm({ title: t.title, content: t.content });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const res = await fetch(`/api/thoughts/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setThoughts((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } else {
      const res = await fetch("/api/thoughts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setThoughts((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
    setModalOpen(false);
  }

  async function remove(t: Thought) {
    if (!(await confirm({ title: "Delete thought?", message: `Delete “${t.title}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/thoughts/${t.id}`, { method: "DELETE" });
    setThoughts((prev) => prev.filter((x) => x.id !== t.id));
    if (selectedId === t.id) setSelectedId(null);
  }

  async function toggleTask(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function addTask(title: string) {
    if (!selected) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, thoughtId: selected.id }),
    });
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
  }

  async function deleteTask(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...noteForm, thoughtId: selected.id }),
    });
    const created = await res.json();
    setNotes((prev) => [created, ...prev]);
    setThoughts((prev) =>
      prev.map((t) =>
        t.id === selected.id
          ? { ...t, linkedNoteIds: [...t.linkedNoteIds, created.id] }
          : t
      )
    );
    setNoteForm({ title: "", content: "<p></p>" });
    setNoteModal(false);
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Thoughts, organized.</h1>
          <p className="text-forest/55 mt-1 text-sm">Capture thoughts, act on them.</p>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          <PlusIcon size={16} /> Capture thought
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_260px] gap-4">
        <div className={`space-y-2 ${mobileDetail ? "hidden lg:block" : ""}`}>
          {thoughts.map((t) => (
            <button
              key={t.id}
              onClick={() => { setSelectedId(t.id); setMobileDetail(true); }}
              className={`w-full text-left card px-4 py-3.5 min-h-[56px] active:opacity-90 ${
                selectedId === t.id ? "bg-sage-muted" : "hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-forest">{t.title}</div>
              <div className="text-xs text-forest/45 mt-1 line-clamp-2">{t.content}</div>
            </button>
          ))}
          {thoughts.length === 0 && (
            <p className="text-sm text-forest/40">No thoughts yet.</p>
          )}
        </div>

        <div className={`card p-5 ${!mobileDetail ? "hidden lg:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All thoughts" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="font-serif text-2xl text-forest">{selected.title}</h2>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button className="btn-ghost text-red-700" onClick={() => remove(selected)}>
                    <TrashIcon size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-forest/75 whitespace-pre-wrap leading-relaxed mb-6">
                {selected.content}
              </p>
              <div className="lg:hidden space-y-6 border-t border-forest/5 pt-5">
                <LinkedNotes notes={linkedNotes} onAdd={() => { setNoteForm({ title: "", content: "<p></p>" }); setNoteEditorKey((k) => k + 1); setNoteModal(true); }} />
                <ActionItems
                  tasks={actionTasks}
                  onToggle={toggleTask}
                  onAdd={addTask}
                  onDelete={deleteTask}
                />
              </div>
            </>
          ) : (
            <p className="text-sm text-forest/40">Select or capture a thought.</p>
          )}
        </div>

        <div className="hidden lg:block space-y-6">
          {selected && (
            <>
              <LinkedNotes notes={linkedNotes} onAdd={() => { setNoteForm({ title: "", content: "<p></p>" }); setNoteEditorKey((k) => k + 1); setNoteModal(true); }} />
              <div className="card p-4">
                <ActionItems
                  tasks={actionTasks}
                  onToggle={toggleTask}
                  onAdd={addTask}
                  onDelete={deleteTask}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit thought" : "Capture thought"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Title</label>
            <input
              className="input-field"
              placeholder="Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Thought</label>
            <textarea
              className="input-field min-h-[140px]"
              placeholder="What's on your mind?"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
          </div>
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

      <Modal open={noteModal} title="Add linked note" onClose={() => setNoteModal(false)}>
        <form onSubmit={addNote} className="space-y-3">
          <input
            className="input-field"
            placeholder="Title"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            required
          />
          <RichTextEditor
            key={noteEditorKey}
            value={noteForm.content}
            onChange={(content) => setNoteForm((f) => ({ ...f, content }))}
            placeholder="Write your note…"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setNoteModal(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add note
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
