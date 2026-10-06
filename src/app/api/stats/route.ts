import { NextResponse } from "next/server";
import { readAssetsFile } from "@/lib/assets-store";
import { readStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  const assets = await readAssetsFile();
  return NextResponse.json({
    notes: store.notes.length,
    tasks: store.tasks.length,
    openTasks: store.tasks.filter((t) => !t.done).length,
    meetings: store.meetings.length,
    thoughts: store.thoughts.length,
    memories: store.memories.length,
    assets: assets.assets.length,
  });
}
