"use client";

import { useCallback, useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "@/components/Icons";
import { Task } from "@/lib/types";

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/tasks");
    setTasks(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });
    const created = await res.json();
    setTasks((prev) => [created, ...prev]);
    setTitle("");
    setBusy(false);
  }

  async function toggle(task: Task) {
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const updated = await res.json();
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function remove(task: Task) {
    await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
  }

  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] md:min-h-screen px-4 md:px-8 py-6 max-w-3xl">
      <header className="mb-6">
        <h1 className="section-title">Tasks.</h1>
        <p className="text-forest/55 mt-1 text-sm">Check things off. Keep momentum calm.</p>
      </header>

      <form onSubmit={add} className="card p-3 flex gap-2 mb-6">
        <input
          className="input-field"
          placeholder="Add a task…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy}>
          <PlusIcon size={16} /> Add
        </button>
      </form>

      <Section title={`Open (${open.length})`}>
        {open.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} />
        ))}
        {open.length === 0 && <p className="text-sm text-forest/40 px-1">All clear.</p>}
      </Section>

      <Section title={`Done (${done.length})`}>
        {done.map((t) => (
          <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} />
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-forest/60 mb-2">{title}</h2>
      <div className="card divide-y divide-forest/5">{children}</div>
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
}: {
  task: Task;
  onToggle: (t: Task) => void;
  onDelete: (t: Task) => void;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 group">
      <button
        onClick={() => onToggle(task)}
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
          task.done ? "bg-sage-dark border-sage-dark text-white" : "border-forest/30"
        }`}
      >
        {task.done && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m5 12 5 5L20 7" />
          </svg>
        )}
      </button>
      <span className={`flex-1 text-sm ${task.done ? "line-through text-forest/40" : "text-forest"}`}>
        {task.title}
      </span>
      <button
        onClick={() => onDelete(task)}
        className="opacity-0 group-hover:opacity-100 p-1 text-forest/40 hover:text-red-600"
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}
