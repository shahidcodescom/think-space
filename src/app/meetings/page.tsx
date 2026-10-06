"use client";

import { useCallback, useEffect, useState } from "react";
import { ActionItems } from "@/components/ActionItems";
import { RichTextEditor } from "@/components/RichTextEditor";
import { LinkedNotes } from "@/components/LinkedNotes";
import { Modal } from "@/components/Modal";
import {
  CalendarIcon,
  CheckCircleIcon,
  DocIcon,
  PencilIcon,
  PlusIcon,
  UsersIcon,
} from "@/components/Icons";
import { MobileBackButton } from "@/components/MobileBackButton";
import { formatDisplayDate } from "@/lib/format";
import { Meeting, Note, Task } from "@/lib/types";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobileDetail, setMobileDetail] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Meeting | null>(null);
  const [noteModal, setNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ title: "", content: "<p></p>" });
  const [noteEditorKey, setNoteEditorKey] = useState(0);
  const [form, setForm] = useState({
    title: "",
    date: "",
    participants: "",
    agenda: "",
    minutes: "",
    decisions: "",
  });

  const load = useCallback(async () => {
    const [mRes, nRes, tRes] = await Promise.all([
      fetch("/api/meetings"),
      fetch("/api/notes"),
      fetch("/api/tasks"),
    ]);
    const mData: Meeting[] = await mRes.json();
    setMeetings(mData);
    setNotes(await nRes.json());
    setTasks(await tRes.json());
    setSelectedId((prev) => prev || mData[0]?.id || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const selected = meetings.find((m) => m.id === selectedId) || null;
  const linkedNotes = selected
    ? notes.filter((n) => selected.linkedNoteIds.includes(n.id))
    : [];
  const actionTasks = selected
    ? tasks.filter((t) => t.meetingId === selected.id)
    : [];

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      date: new Date().toISOString().slice(0, 10),
      participants: "",
      agenda: "",
      minutes: "",
      decisions: "",
    });
    setModalOpen(true);
  }

  function openEdit(m: Meeting) {
    setEditing(m);
    setForm({
      title: m.title,
      date: m.date,
      participants: m.participants.join(", "),
      agenda: m.agenda,
      minutes: m.minutes,
      decisions: m.decisions,
    });
    setModalOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (editing) {
      const res = await fetch(`/api/meetings/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const updated = await res.json();
      setMeetings((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    } else {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const created = await res.json();
      setMeetings((prev) => [created, ...prev]);
      setSelectedId(created.id);
    }
    setModalOpen(false);
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
      body: JSON.stringify({ title, meetingId: selected.id }),
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
      body: JSON.stringify({ ...noteForm, meetingId: selected.id }),
    });
    const created = await res.json();
    setNotes((prev) => [created, ...prev]);
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === selected.id
          ? { ...m, linkedNoteIds: [...m.linkedNoteIds, created.id] }
          : m
      )
    );
    setNoteForm({ title: "", content: "<p></p>" });
    setNoteModal(false);
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Meetings with a next step.</h1>
        </div>
        <button className="btn-primary shrink-0" onClick={openCreate}>
          <PlusIcon size={16} /> Add meeting
        </button>
      </header>

      {/* Desktop 3-col / Mobile stack */}
      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_260px] gap-4">
        {/* List */}
        <div className={mobileDetail ? "hidden lg:block" : ""}>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-2">
            Meetings
          </h2>
          <div className="space-y-2">
            {meetings.map((m) => (
              <button
                key={m.id}
                onClick={() => { setSelectedId(m.id); setMobileDetail(true); }}
                className={`w-full text-left card px-4 py-3.5 min-h-[56px] transition-colors active:opacity-90 ${
                  selectedId === m.id
                    ? "bg-sage-muted border-sage"
                    : "hover:bg-white"
                }`}
              >
                <div className="text-sm font-semibold text-forest">{m.title}</div>
                <div className="text-xs text-forest/50 mt-1">
                  {formatDisplayDate(m.date)}
                </div>
                <div className="text-xs text-forest/45 mt-0.5">
                  {m.participants.join(", ")}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Detail */}
        <div className={`card p-5 ${!mobileDetail ? "hidden lg:block" : ""}`}>
          {selected ? (
            <>
              <MobileBackButton onClick={() => setMobileDetail(false)} label="All meetings" />
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-2xl md:text-3xl text-forest">
                    {selected.title}
                  </h2>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-forest/55">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarIcon size={14} /> {formatDisplayDate(selected.date)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <UsersIcon size={14} /> {selected.participants.join(", ")}
                    </span>
                  </div>
                </div>
                <button className="btn-ghost" onClick={() => openEdit(selected)}>
                  <PencilIcon size={14} /> Edit MOM
                </button>
              </div>

              <div className="space-y-3">
                <MomBlock icon={<DocIcon size={18} />} label="Agenda" text={selected.agenda} />
                <MomBlock icon={<PencilIcon size={18} />} label="Minutes" text={selected.minutes} />
                <MomBlock
                  icon={<CheckCircleIcon size={18} />}
                  label="Decisions"
                  text={selected.decisions}
                />
              </div>

              {/* Mobile linked sections */}
              <div className="lg:hidden mt-6 space-y-6 border-t border-forest/5 pt-5">
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
            <p className="text-sm text-forest/40">Select or add a meeting.</p>
          )}
        </div>

        {/* Right panel desktop */}
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
        title={editing ? "Edit meeting" : "Add meeting"}
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
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Date</label>
            <input
              type="date"
              className="input-field"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Participants</label>
            <input
              className="input-field"
              placeholder="Comma separated"
              value={form.participants}
              onChange={(e) => setForm({ ...form, participants: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Agenda</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Agenda"
              value={form.agenda}
              onChange={(e) => setForm({ ...form, agenda: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Minutes</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Minutes"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Decisions</label>
            <textarea
              className="input-field min-h-[80px]"
              placeholder="Decisions"
              value={form.decisions}
              onChange={(e) => setForm({ ...form, decisions: e.target.value })}
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
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/50 mb-1.5">Title</label>
            <input
              className="input-field"
              placeholder="Title"
              value={noteForm.title}
              onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
              required
            />
          </div>
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

function MomBlock({
  icon,
  label,
  text,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-xl bg-cream-soft border border-forest/5 px-4 py-3 flex gap-3">
      <div className="text-forest/55 mt-0.5">{icon}</div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-forest/50 mb-0.5">
          {label}
        </div>
        <p className="text-sm text-forest/80">{text || "—"}</p>
      </div>
    </div>
  );
}
