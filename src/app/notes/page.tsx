"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { RichTextEditor } from "@/components/RichTextEditor";
import { SafeHtml } from "@/components/SafeHtml";
import { MobileBackButton } from "@/components/MobileBackButton";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { stripHtml } from "@/lib/sanitize";
import { Note } from "@/lib/types";

function NotesInner() {
  const confirm = useConfirm();
  const search = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", content: "" });
  const [editorKey, setEditorKey] = useState(0);
  const [mobileDetail, setMobileDetail] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/notes");
    const data: Note[] = await res.json();
    setNotes(data);
    const qid = search.get("id");
    if (qid && data.some((n) => n.id === qid)) {
      setSelectedId(qid);
    } else {
      setSelectedId((prev) => prev || data[0]?.id || null);
    }
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

  const selected = notes.find((n) => n.id === selectedId) || null;

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "<p></p>" });
    setEditorKey((k) => k + 1);
    setModalOpen(true);
  }

  function openEdit(note: Note) {
    setEditing(note);
    setForm({ title: note.title, content: note.content || "<p></p>" });
    setEditorKey((k) => k + 1);
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const res = await fetch(`/api/notes/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    } else {
      const res = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setNotes((prev) => [created, ...prev]);
      setSelectedId(created.id);
      setMobileDetail(true);
    }
    setModalOpen(false);
  }

  async function remove(note: Note) {
    if (!(await confirm({ title: "Delete note?", message: `Delete “${note.title}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/notes/${note.id}`, { method: "DELETE" });
    setNotes((prev) => prev.filter((n) => n.id !== note.id));
    if (selectedId === note.id) setSelectedId(null);
  }

  return (
    <div className="page-shell h-[calc(100dvh-8rem)] md:h-[100dvh] flex flex-col">
      <header className="page-header">
        <div>
          <h1 className="section-title">Notes.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Capture ideas. Link them to meetings and thoughts.
          </p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon size={16} /> Add note
        </button>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
        <div className={`card p-3 overflow-y-auto scroll-thin space-y-2 ${mobileDetail ? "hidden md:block" : ""}`}>
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => {
                setSelectedId(n.id);
                setMobileDetail(true);
              }}
              className={`w-full text-left rounded-xl px-3 py-3.5 min-h-[52px] transition-colors active:bg-sage-muted/70 ${
                selectedId === n.id ? "bg-sage-muted" : "hover:bg-cream"
              }`}
            >
              <div className="text-sm font-medium text-forest">{n.title}</div>
              <div className="text-xs text-forest/45 mt-0.5 line-clamp-2">
                {stripHtml(n.content)}
              </div>
            </button>
          ))}
          {notes.length === 0 && (
            <p className="text-sm text-forest/40 p-3">No notes yet.</p>
          )}
        </div>

        <div className={`card p-5 overflow-y-auto scroll-thin ${!mobileDetail ? "hidden md:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All notes" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <h2 className="font-serif text-2xl text-forest">{selected.title}</h2>
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
              <SafeHtml html={selected.content} />
            </>
          ) : (
            <p className="text-sm text-forest/40">Select a note or create one.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit note" : "New note"}
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={save} className="space-y-3">
          <input
            className="input-field"
            placeholder="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <RichTextEditor
            key={editorKey}
            value={form.content}
            onChange={(content) => setForm((f) => ({ ...f, content }))}
            placeholder="Write your note…"
          />
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

export default function NotesPage() {
  return (
    <Suspense
      fallback={
        <div className="px-8 py-6 text-sm text-forest/50">Loading notes…</div>
      }
    >
      <NotesInner />
    </Suspense>
  );
}
