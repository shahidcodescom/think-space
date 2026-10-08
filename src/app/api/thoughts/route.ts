import { NextRequest, NextResponse } from "next/server";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.thoughts);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const store = await readStore();
  const thought = {
    id: uid("thought"),
    title: body.title || "New thought",
    content: body.content || "",
    linkedNoteIds: body.linkedNoteIds || [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  store.thoughts.unshift(thought);
  await writeStore(store);
  return NextResponse.json(thought, { status: 201 });
}
