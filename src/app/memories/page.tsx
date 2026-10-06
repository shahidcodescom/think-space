"use client";

import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { MobileBackButton } from "@/components/MobileBackButton";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { formatDisplayDate } from "@/lib/format";
import { Memory } from "@/lib/types";

export default function MemoriesPage() {
  const confirm = useConfirm();
  const [memories, setMemories] = useState<Memory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/memories");
    const data: Memory[] = await res.json();
    setMemories(data);
    setSelectedId((prev) => prev || data[0]?.id || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = memories.find((m) => m.id === selectedId) || null;

  function openCreate() {
    setEditing(null);
    setForm({ title: "", content: "", tags: "" });
    setModalOpen(true);
  }

  function openEdit(m: Memory) {
    setEditing(m);
    setForm({ title: m.title, content: m.content, tags: m.tags.join(", ") });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const res = await fetch(`/api/memories/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setMemories((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      const res = await fetch("/api/memories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setMemories((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
    setModalOpen(false);
  }

  async function remove(m: Memory) {
    if (!(await confirm({ title: "Delete memory?", message: `Delete “${m.title}”?`, confirmLabel: "Delete" }))) return;
    await fetch(`/api/memories/${m.id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((x) => x.id !== m.id));
    if (selectedId === m.id) setSelectedId(null);
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Memories.</h1>
          <p className="text-forest/55 mt-1 text-sm">Archive moments. Revisit what mattered.</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <PlusIcon size={16} /> Add memory
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4">
        <div className={`space-y-2 max-h-[70vh] overflow-y-auto scroll-thin ${mobileDetail ? "hidden md:block" : ""}`}>
          {memories.map((m) => (
            <button
              key={m.id}
              onClick={() => { setSelectedId(m.id); setMobileDetail(true); }}
              className={`w-full text-left card px-4 py-3.5 min-h-[52px] active:opacity-90 ${
                selectedId === m.id ? "bg-teal-soft" : "hover:bg-white"
              }`}
            >
              <div className="text-sm font-semibold text-forest">{m.title}</div>
              <div className="text-xs text-forest/45 mt-1">
                {formatDisplayDate(m.createdAt)}
              </div>
              {m.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {m.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] uppercase tracking-wide bg-forest/5 text-forest/60 px-2 py-0.5 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>

        <div className={`card p-5 ${!mobileDetail ? "hidden md:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All memories" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl text-forest">{selected.title}</h2>
                  <p className="text-xs text-forest/45 mt-1">
                    {formatDisplayDate(selected.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => openEdit(selected)}>
                    <PencilIcon size={14} /> Edit
                  </button>
                  <button className="btn-ghost text-red-700" onClick={() => remove(selected)}>
                    <TrashIcon size={14} /> Delete
                  </button>
                </div>
              </div>
              <p className="text-sm text-forest/75 whitespace-pre-wrap leading-relaxed">
                {selected.content}
              </p>
            </>
          ) : (
            <p className="text-sm text-forest/40">Select a memory.</p>
          )}
        </div>
      </div>

      <Modal
        open={modalOpen}
        title={editing ? "Edit memory" : "New memory"}
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
          <textarea
            className="input-field min-h-[120px]"
            placeholder="What do you want to remember?"
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
          />
          <input
            className="input-field"
            placeholder="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => setForm({ ...form, tags: e.target.value })}
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
