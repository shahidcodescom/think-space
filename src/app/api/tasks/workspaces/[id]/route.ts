import { NextRequest, NextResponse } from "next/server";
import {
  readTaskWorkspacesFile,
  writeTaskWorkspacesFile,
} from "@/lib/task-workspaces-store";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (name.length > 64) {
    return NextResponse.json(
      { error: "Name must be 64 characters or fewer" },
      { status: 400 }
    );
  }

  const file = await readTaskWorkspacesFile();
  const idx = file.workspaces.findIndex((w) => w.id === params.id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const dup = file.workspaces.some(
    (w) => w.id !== params.id && w.name.toLowerCase() === name.toLowerCase()
  );
  if (dup) {
    return NextResponse.json(
      { error: "Workspace already exists" },
      { status: 409 }
    );
  }

  file.workspaces[idx] = {
    ...file.workspaces[idx],
    name,
    updatedAt: nowIso(),
  };
  await writeTaskWorkspacesFile(file);
  return NextResponse.json(file.workspaces[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readTaskWorkspacesFile();
  const target = file.workspaces.find((w) => w.id === params.id);
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const remaining = file.workspaces.filter((w) => w.id !== params.id);
  if (remaining.length === 0) {
    return NextResponse.json(
      { error: "Cannot delete the last workspace" },
      { status: 400 }
    );
  }

  const fallbackId = remaining[0].id;
  const store = await readStore();
  if (store.tasks.some((t) => t.workspaceId === params.id)) {
    store.tasks = store.tasks.map((t) =>
      t.workspaceId === params.id ? { ...t, workspaceId: fallbackId } : t
    );
    await writeStore(store);
  }

  await writeTaskWorkspacesFile({ workspaces: remaining });
  return NextResponse.json({ ok: true, movedTo: fallbackId });
}
