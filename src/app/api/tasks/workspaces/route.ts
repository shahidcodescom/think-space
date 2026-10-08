import { NextRequest, NextResponse } from "next/server";
import {
  ensureTaskWorkspaces,
  readTaskWorkspacesFile,
  writeTaskWorkspacesFile,
} from "@/lib/task-workspaces-store";
import { nowIso, uid } from "@/lib/store";
import { TaskWorkspace } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const workspaces = await ensureTaskWorkspaces();
  const sorted = [...workspaces].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
  return NextResponse.json(sorted);
}

export async function POST(req: NextRequest) {
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

  await ensureTaskWorkspaces();
  const file = await readTaskWorkspacesFile();
  const dup = file.workspaces.some(
    (w) => w.name.toLowerCase() === name.toLowerCase()
  );
  if (dup) {
    return NextResponse.json(
      { error: "Workspace already exists" },
      { status: 409 }
    );
  }

  const ts = nowIso();
  const record: TaskWorkspace = {
    id: uid("wspace"),
    name,
    createdAt: ts,
    updatedAt: ts,
  };
  file.workspaces.push(record);
  await writeTaskWorkspacesFile(file);
  return NextResponse.json(record, { status: 201 });
}
