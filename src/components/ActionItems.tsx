"use client";

import { useState } from "react";
import { PlusIcon } from "./Icons";
import { Task } from "@/lib/types";

export function ActionItems({
  tasks,
  onToggle,
  onAdd,
  onDelete,
}: {
  tasks: Task[];
  onToggle: (task: Task) => void;
  onAdd: (title: string) => Promise<void>;
  onDelete?: (task: Task) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || busy) return;
    setBusy(true);
    await onAdd(title.trim());
    setTitle("");
    setAdding(false);
    setBusy(false);
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-forest mb-3">Action items</h3>
      <ul className="space-y-2 mb-3">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-start gap-2 group">
            <button
              onClick={() => onToggle(t)}
              className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                t.done
                  ? "bg-sage-dark border-sage-dark text-white"
                  : "border-forest/30 bg-white"
              }`}
              aria-label={t.done ? "Mark incomplete" : "Mark complete"}
            >
              {t.done && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="m5 12 5 5L20 7" />
                </svg>
              )}
            </button>
            <span
              className={`text-sm flex-1 ${
                t.done ? "line-through text-forest/40" : "text-forest/80"
              }`}
            >
              {t.title}
            </span>
            {onDelete && (
              <button
                onClick={() => onDelete(t)}
                className="opacity-0 group-hover:opacity-100 text-xs text-forest/40 hover:text-red-600"
              >
                Remove
              </button>
            )}
          </li>
        ))}
        {tasks.length === 0 && (
          <li className="text-sm text-forest/40">No action items yet.</li>
        )}
      </ul>
      {adding ? (
        <form onSubmit={submit} className="flex gap-2">
          <input
            className="input-field"
            autoFocus
            aria-label="New action item"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New action item…"
          />
          <button type="submit" className="btn-primary" disabled={busy}>
            Add
          </button>
        </form>
      ) : (
        <button className="btn-ghost w-full justify-center" onClick={() => setAdding(true)}>
          <PlusIcon size={16} /> Add task
        </button>
      )}
    </div>
  );
}
