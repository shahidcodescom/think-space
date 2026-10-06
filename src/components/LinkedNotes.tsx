"use client";

import Link from "next/link";
import { ChevronRightIcon, PlusIcon } from "./Icons";
import { Note } from "@/lib/types";

export function LinkedNotes({
  notes,
  onAdd,
}: {
  notes: Note[];
  onAdd: () => void;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-forest mb-3">Linked notes</h3>
      <div className="space-y-2 mb-3">
        {notes.map((n) => (
          <Link
            key={n.id}
            href={`/notes?id=${n.id}`}
            className="card flex items-center justify-between px-4 py-3 hover:bg-sage-muted/40 transition-colors"
          >
            <span className="text-sm font-medium text-forest">{n.title}</span>
            <ChevronRightIcon size={16} className="text-forest/40" />
          </Link>
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-forest/40">No linked notes yet.</p>
        )}
      </div>
      <button className="btn-ghost w-full justify-center" onClick={onAdd}>
        <PlusIcon size={16} /> Add note
      </button>
    </div>
  );
}
