import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import {
  readLibraryFile,
  resolveLibraryPath,
  writeLibraryFile,
} from "@/lib/library-store";
import { nowIso } from "@/lib/store";
import { LibraryItemType } from "@/lib/types";

const TYPES: LibraryItemType[] = ["link", "image", "pdf", "document", "other"];

function parseTags(raw: unknown): string[] | undefined {
  if (raw === undefined) return undefined;
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return [];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readLibraryFile();
  const item = file.items.find((i) => i.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readLibraryFile();
  const idx = file.items.findIndex((i) => i.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.items[idx] };
  if (typeof body.title === "string" && body.title.trim()) {
    next.title = body.title.trim();
  }
  if (TYPES.includes(body.type)) next.type = body.type;
  if (typeof body.url === "string") next.url = body.url.trim();
  if (typeof body.notes === "string") next.notes = body.notes;
  const tags = parseTags(body.tags);
  if (tags !== undefined) next.tags = tags;

  next.updatedAt = nowIso();
  file.items[idx] = next;
  await writeLibraryFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readLibraryFile();
  const item = file.items.find((i) => i.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (item.filePath) {
    const abs = resolveLibraryPath(item.filePath);
    if (abs) {
      try {
        await fs.unlink(abs);
      } catch {
        /* ignore */
      }
    }
  }

  file.items = file.items.filter((i) => i.id !== params.id);
  await writeLibraryFile(file);
  return NextResponse.json({ ok: true });
}
