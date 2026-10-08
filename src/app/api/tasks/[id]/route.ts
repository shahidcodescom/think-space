import { NextRequest, NextResponse } from "next/server";
import { readTaskWorkspacesFile } from "@/lib/task-workspaces-store";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const store = await readStore();
  const idx = store.tasks.findIndex((t) => t.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (body.workspaceId !== undefined && body.workspaceId !== null) {
    const file = await readTaskWorkspacesFile();
    if (!file.workspaces.some((w) => w.id === body.workspaceId)) {
      return NextResponse.json(
        { error: "Unknown workspace" },
        { status: 400 }
      );
    }
  }
  store.tasks[idx] = {
    ...store.tasks[idx],
    ...body,
    id: params.id,
    updatedAt: nowIso(),
  };
  await writeStore(store);
  return NextResponse.json(store.tasks[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  store.tasks = store.tasks.filter((t) => t.id !== params.id);
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
