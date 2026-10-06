import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.meetings);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const meeting = {
    id: uid("meeting"),
    title: body.title || "New meeting",
    date: body.date || new Date().toISOString().slice(0, 10),
    participants: Array.isArray(body.participants)
      ? body.participants
      : String(body.participants || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
    agenda: body.agenda || "",
    minutes: body.minutes || "",
    decisions: body.decisions || "",
    linkedNoteIds: body.linkedNoteIds || [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.meetings.unshift(meeting);
  await writeStore(store);
  return NextResponse.json(meeting, { status: 201 });
}
