"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";
import { useConfirm } from "@/components/ConfirmDialog";
import { PencilIcon, PlusIcon, TrashIcon } from "@/components/Icons";
import { Task, TaskWorkspace } from "@/lib/types";

export default function TasksPage() {
  const confirm = useConfirm();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workspaces, setWorkspaces] = useState<TaskWorkspace[]>([]);
  const [activeWorkspace, setActiveWorkspace] = useState<string>("all");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  const [wsModalOpen, setWsModalOpen] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState("");
  const [wsError, setWsError] = useState<string | null>(null);
  const [wsBusy, setWsBusy] = useState(false);
  const [editingWs, setEditingWs] = useState<TaskWorkspace | null>(null);
  const [editWsName, setEditWsName] = useState("");

  const load = useCallback(async () => {
    const [tRes, wRes] = await Promise.all([
      fetch("/api/tasks"),
      fetch("/api/tasks/workspaces"),
    ]);
    setTasks(await tRes.json());
    if (wRes.ok) {
      const ws: TaskWorkspace[] = await wRes.json();
      setWorkspaces(ws);
      setActiveWorkspace((prev) =>
        prev !== "all" && !ws.some((w) => w.id === prev) ? "all" : prev
      );
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const workspaceName = useMemo(() => {
    const map = new Map(workspaces.map((w) => [w.id, w.name]));
    return (id: string | null | undefined) =>
      (id && map.get(id)) || "Personal";
  }, [workspaces]);

  const visible = useMemo(
    () =>
      activeWorkspace === "all"
        ? tasks
        : tasks.filter((t) => t.workspaceId === activeWorkspace),
    [tasks, activeWorkspace]
  );
  const open = visible.filter((t) => !t.done);
  const done = visible.filter((t) => t.done);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        workspaceId:
          activeWorkspace === "all" ? undefined : activeWorkspace,
      }),
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

  async function addWorkspace(e: React.FormEvent) {
    e.preventDefault();
    setWsError(null);
    const name = newWorkspace.trim();
    if (!name) return;
    setWsBusy(true);
    try {
      const res = await fetch("/api/tasks/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWsError(data.error || "Could not add workspace");
        return;
      }
      setWorkspaces((prev) =>
        [...prev, data].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        )
      );
      setNewWorkspace("");
    } finally {
      setWsBusy(false);
    }
  }

  async function saveWorkspaceEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingWs) return;
    setWsError(null);
    const name = editWsName.trim();
    if (!name) return;
    setWsBusy(true);
    try {
      const res = await fetch(`/api/tasks/workspaces/${editingWs.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setWsError(data.error || "Could not rename workspace");
        return;
      }
      setWorkspaces((prev) =>
        prev
          .map((w) => (w.id === data.id ? data : w))
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          )
      );
      setEditingWs(null);
      setEditWsName("");
    } finally {
      setWsBusy(false);
    }
  }

  async function deleteWorkspace(ws: TaskWorkspace) {
    if (
      !(await confirm({
        title: "Delete workspace?",
        message: `Delete workspace “${ws.name}”? Its tasks move to the first remaining workspace.`,
        confirmLabel: "Delete",
      }))
    ) {
      return;
    }
    setWsError(null);
    const res = await fetch(`/api/tasks/workspaces/${ws.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setWsError(data.error || "Could not delete workspace");
      return;
    }
    setWorkspaces((prev) => prev.filter((w) => w.id !== ws.id));
    if (activeWorkspace === ws.id) setActiveWorkspace("all");
    await load();
  }

  return (
    <div className="page-shell min-h-[calc(100dvh-8rem)] md:min-h-screen">
      <header className="page-header">
        <div>
          <h1 className="section-title">Tasks.</h1>
          <p className="text-forest/55 mt-1 text-sm">
            Check things off. Keep momentum calm.
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4 items-start">
        <div className="card p-3 space-y-1 md:sticky md:top-4">
          <div className="flex items-center justify-between px-1 pb-1">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-forest/50">
              Workspaces
            </h2>
            <button
              type="button"
              className="btn-ghost !px-2 !py-1 !min-h-0 text-xs"
              onClick={() => {
                setWsError(null);
                setEditingWs(null);
                setNewWorkspace("");
                setWsModalOpen(true);
              }}
            >
              Manage
            </button>
          </div>
          <button
            type="button"
            onClick={() => setActiveWorkspace("all")}
            className={`w-full text-left rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
              activeWorkspace === "all"
                ? "bg-sage-muted text-forest"
                : "text-forest/70 hover:bg-cream"
            }`}
          >
            All tasks
            <span className="text-xs text-forest/40">
              {tasks.filter((t) => !t.done).length}
            </span>
          </button>
          {workspaces.map((w) => {
            const openCount = tasks.filter(
              (t) => t.workspaceId === w.id && !t.done
            ).length;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setActiveWorkspace(w.id)}
                className={`w-full text-left rounded-xl px-3 py-2.5 min-h-[44px] text-sm font-medium transition-colors flex items-center justify-between gap-2 ${
                  activeWorkspace === w.id
                    ? "bg-sage-muted text-forest"
                    : "text-forest/70 hover:bg-cream"
                }`}
              >
                <span className="truncate">{w.name}</span>
                <span className="text-xs text-forest/40">{openCount}</span>
              </button>
            );
          })}
        </div>

        <div className="min-w-0">
      <form onSubmit={add} className="card p-3 flex gap-2 mb-6">
        <input
          className="input-field"
          placeholder={
            activeWorkspace === "all"
              ? "Add a task…"
              : `Add a task to ${workspaceName(activeWorkspace)}…`
          }
          aria-label="New task"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button type="submit" className="btn-primary shrink-0" disabled={busy}>
          <PlusIcon size={16} /> Add
        </button>
      </form>

      <Section title={`Open (${open.length})`}>
        {open.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            wsLabel={
              activeWorkspace === "all"
                ? workspaceName(t.workspaceId)
                : undefined
            }
            onToggle={toggle}
            onDelete={remove}
          />
        ))}
        {open.length === 0 && <p className="text-sm text-forest/40 px-1">All clear.</p>}
      </Section>

      <Section title={`Done (${done.length})`}>
        {done.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            wsLabel={
              activeWorkspace === "all"
                ? workspaceName(t.workspaceId)
                : undefined
            }
            onToggle={toggle}
            onDelete={remove}
          />
        ))}
      </Section>
        </div>
      </div>

      <Modal
        open={wsModalOpen}
        title="Task workspaces"
        onClose={() => {
          setWsModalOpen(false);
          setEditingWs(null);
          setWsError(null);
        }}
      >
        <div className="space-y-4">
          <form onSubmit={addWorkspace} className="flex gap-2">
            <input
              className="input-field"
              placeholder="New workspace name"
              value={newWorkspace}
              onChange={(e) => setNewWorkspace(e.target.value)}
              maxLength={64}
            />
            <button
              type="submit"
              className="btn-primary shrink-0"
              disabled={wsBusy || !newWorkspace.trim()}
            >
              <PlusIcon size={16} /> Add
            </button>
          </form>

          {wsError && (
            <p className="text-sm text-red-700" role="alert">
              {wsError}
            </p>
          )}

          <ul className="card divide-y divide-forest/5">
            {workspaces.map((ws) => (
              <li
                key={ws.id}
                className="flex items-center gap-2 px-3 py-2.5 min-h-[48px]"
              >
                {editingWs?.id === ws.id ? (
                  <form
                    onSubmit={saveWorkspaceEdit}
                    className="flex-1 flex gap-2 min-w-0"
                  >
                    <input
                      className="input-field"
                      value={editWsName}
                      onChange={(e) => setEditWsName(e.target.value)}
                      maxLength={64}
                      autoFocus
                    />
                    <button
                      type="submit"
                      className="btn-primary shrink-0"
                      disabled={wsBusy || !editWsName.trim()}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="btn-ghost shrink-0"
                      onClick={() => {
                        setEditingWs(null);
                        setEditWsName("");
                      }}
                    >
                      Cancel
                    </button>
                  </form>
                ) : (
                  <>
                    <span className="flex-1 text-sm font-medium text-forest truncate">
                      {ws.name}
                      <span className="text-forest/40 font-normal">
                        {" "}
                        · {tasks.filter((t) => t.workspaceId === ws.id).length}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="btn-ghost shrink-0"
                      aria-label={`Rename ${ws.name}`}
                      onClick={() => {
                        setEditingWs(ws);
                        setEditWsName(ws.name);
                        setWsError(null);
                      }}
                    >
                      <PencilIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="btn-ghost shrink-0 text-red-700"
                      aria-label={`Delete ${ws.name}`}
                      onClick={() => deleteWorkspace(ws)}
                      disabled={workspaces.length <= 1}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-forest/45">
            Deleting a workspace moves its tasks to the first remaining workspace.
          </p>
        </div>
      </Modal>
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
  wsLabel,
  onToggle,
  onDelete,
}: {
  task: Task;
  wsLabel?: string;
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
      {wsLabel && (
        <span className="text-[10px] uppercase tracking-wide bg-forest/5 text-forest/50 px-2 py-0.5 rounded-full shrink-0">
          {wsLabel}
        </span>
      )}
      <button
        onClick={() => onDelete(task)}
        className="touch-row-action p-1 text-forest/40 hover:text-red-600"
      >
        <TrashIcon size={14} />
      </button>
    </div>
  );
}
