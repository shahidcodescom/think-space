import { NextRequest, NextResponse } from "next/server";
import { ensureHtml } from "@/lib/sanitize";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  const note = store.notes.find((n) => n.id === params.id);
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(note);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const store = await readStore();
  const idx = store.notes.findIndex((n) => n.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = {
    ...store.notes[idx],
    ...body,
    id: params.id,
    updatedAt: nowIso(),
  };
  if (typeof body.content === "string") {
    next.content = ensureHtml(body.content);
  }
  store.notes[idx] = next;
  await writeStore(store);
  return NextResponse.json(store.notes[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  store.notes = store.notes.filter((n) => n.id !== params.id);
  store.meetings.forEach((m) => {
    m.linkedNoteIds = m.linkedNoteIds.filter((id) => id !== params.id);
  });
  store.thoughts.forEach((t) => {
    t.linkedNoteIds = t.linkedNoteIds.filter((id) => id !== params.id);
  });
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
