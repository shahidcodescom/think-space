import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  const meeting = store.meetings.find((m) => m.id === params.id);
  if (!meeting) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(meeting);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const store = await readStore();
  const idx = store.meetings.findIndex((m) => m.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.participants === "string") {
    body.participants = body.participants
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  store.meetings[idx] = {
    ...store.meetings[idx],
    ...body,
    id: params.id,
    updatedAt: nowIso(),
  };
  await writeStore(store);
  return NextResponse.json(store.meetings[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  store.meetings = store.meetings.filter((m) => m.id !== params.id);
  store.tasks.forEach((t) => {
    if (t.meetingId === params.id) t.meetingId = null;
  });
  store.notes.forEach((n) => {
    n.linkedMeetingIds = n.linkedMeetingIds.filter((id) => id !== params.id);
  });
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
