import { NextRequest, NextResponse } from "next/server";
import { ensureHtml } from "@/lib/sanitize";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.notes);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const note = {
    id: uid("note"),
    title: body.title || "Untitled note",
    content: ensureHtml(body.content || ""),
    linkedMeetingIds: body.linkedMeetingIds || [],
    linkedThoughtIds: body.linkedThoughtIds || [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.notes.unshift(note);
  if (body.meetingId) {
    const m = store.meetings.find((x) => x.id === body.meetingId);
    if (m && !m.linkedNoteIds.includes(note.id)) {
      m.linkedNoteIds.push(note.id);
      note.linkedMeetingIds.push(m.id);
    }
  }
  if (body.thoughtId) {
    const t = store.thoughts.find((x) => x.id === body.thoughtId);
    if (t && !t.linkedNoteIds.includes(note.id)) {
      t.linkedNoteIds.push(note.id);
      note.linkedThoughtIds.push(t.id);
    }
  }
  await writeStore(store);
  return NextResponse.json(note, { status: 201 });
}
