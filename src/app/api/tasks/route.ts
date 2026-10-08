import { NextRequest, NextResponse } from "next/server";
import { ensureTaskWorkspaces } from "@/lib/task-workspaces-store";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const store = await readStore();
  const { searchParams } = new URL(req.url);
  const meetingId = searchParams.get("meetingId");
  const thoughtId = searchParams.get("thoughtId");
  const workspaceId = searchParams.get("workspaceId");
  let tasks = store.tasks;
  if (meetingId) tasks = tasks.filter((t) => t.meetingId === meetingId);
  if (thoughtId) tasks = tasks.filter((t) => t.thoughtId === thoughtId);
  if (workspaceId) tasks = tasks.filter((t) => t.workspaceId === workspaceId);
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const workspaces = await ensureTaskWorkspaces();
  let workspaceId = body.workspaceId || null;
  if (workspaceId && !workspaces.some((w) => w.id === workspaceId)) {
    return NextResponse.json({ error: "Unknown workspace" }, { status: 400 });
  }
  if (!workspaceId) workspaceId = workspaces[0]?.id || null;
  const task = {
    id: uid("task"),
    title: body.title || "New task",
    done: false,
    meetingId: body.meetingId || null,
    thoughtId: body.thoughtId || null,
    workspaceId,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.tasks.unshift(task);
  await writeStore(store);
  return NextResponse.json(task, { status: 201 });
}
