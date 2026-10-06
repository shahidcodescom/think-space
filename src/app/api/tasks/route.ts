import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const store = await readStore();
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");
  const thoughtId = searchParams.get("thoughtId");
  let tasks = store.tasks;
  if (meetingId) tasks = tasks.filter((t) => t.meetingId === meetingId);
  if (thoughtId) tasks = tasks.filter((t) => t.thoughtId === thoughtId);
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const task = {
    id: uid("task"),
    title: body.title || "New task",
    done: false,
    meetingId: body.meetingId || null,
    thoughtId: body.thoughtId || null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.tasks.unshift(task);
  await writeStore(store);
  return NextResponse.json(task, { status: 201 });
}
