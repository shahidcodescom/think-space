import { NextRequest, NextResponse } from "next/server";
import { readLibraryFile, writeLibraryFile } from "@/lib/library-store";
import { nowIso, uid } from "@/lib/store";
import { LibraryItem, LibraryItemType } from "@/lib/types";

const TYPES: LibraryItemType[] = ["link", "image", "pdf", "document", "other"];

function parseTags(raw: unknown, fallback: string[] = []): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    return raw
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalize(
  body: Record<string, unknown>,
  base?: LibraryItem
): LibraryItem {
  const type = TYPES.includes(body.type as LibraryItemType)
    ? (body.type as LibraryItemType)
    : base?.type || "link";

  return {
    id: base?.id || uid("lib"),
    title: String(body.title ?? base?.title ?? "Untitled").trim() || "Untitled",
    type,
    url: String(body.url ?? base?.url ?? "").trim(),
    notes: String(body.notes ?? base?.notes ?? ""),
    tags: body.tags !== undefined ? parseTags(body.tags) : base?.tags || [],
    filePath:
      body.filePath !== undefined
        ? body.filePath === null || body.filePath === ""
          ? null
          : String(body.filePath)
        : base?.filePath ?? null,
    fileName:
      body.fileName !== undefined
        ? body.fileName === null || body.fileName === ""
          ? null
          : String(body.fileName)
        : base?.fileName ?? null,
    mimeType:
      body.mimeType !== undefined
        ? body.mimeType === null || body.mimeType === ""
          ? null
          : String(body.mimeType)
        : base?.mimeType ?? null,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const tag = (searchParams.get("tag") || "").toLowerCase().trim();
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const file = await readLibraryFile();
  let items = file.items;

  if (type && TYPES.includes(type as LibraryItemType)) {
    items = items.filter((i) => i.type === type);
  }
  if (tag) {
    items = items.filter((i) => i.tags.some((t) => t.toLowerCase() === tag));
  }
  if (q) {
    items = items.filter((i) =>
      `${i.title} ${i.notes} ${i.url} ${i.tags.join(" ")}`.toLowerCase().includes(q)
    );
  }

  items = [...items].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.title || "").trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  const item = normalize(body);
  if (item.type === "link" && !item.url) {
    return NextResponse.json({ error: "URL is required for links" }, { status: 400 });
  }
  const file = await readLibraryFile();
  file.items.unshift(item);
  await writeLibraryFile(file);
  return NextResponse.json(item, { status: 201 });
}
