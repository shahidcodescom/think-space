import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.memories);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const memory = {
    id: uid("memory"),
    title: body.title || "New memory",
    content: body.content || "",
    tags: Array.isArray(body.tags)
      ? body.tags
      : String(body.tags || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.memories.unshift(memory);
  await writeStore(store);
  return NextResponse.json(memory, { status: 201 });
}
