import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, writeStore } from "@/lib/store";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const store = await readStore();
  const idx = store.memories.findIndex((m) => m.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (typeof body.tags === "string") {
    body.tags = body.tags
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
  }
  store.memories[idx] = {
    ...store.memories[idx],
    ...body,
    id: params.id,
    updatedAt: nowIso(),
  };
  await writeStore(store);
  return NextResponse.json(store.memories[idx]);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = await readStore();
  store.memories = store.memories.filter((m) => m.id !== params.id);
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
