import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  const thought = store.thoughts.find((t) => t.id === params.id);
  if (!thought) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(thought);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const store = await readStore();
  const idx = store.thoughts.findIndex((t) => t.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  store.thoughts[idx] = {
    ...store.thoughts[idx],
    ...body,
    id: params.id,
    updatedAt: nowIso(),
  };
  await writeStore(store);
  return NextResponse.json(store.thoughts[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  store.thoughts = store.thoughts.filter((t) => t.id !== params.id);
  store.tasks.forEach((t) => {
    if (t.thoughtId === params.id) t.thoughtId = null;
  });
  store.notes.forEach((n) => {
    n.linkedThoughtIds = n.linkedThoughtIds.filter((id) => id !== params.id);
  });
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
