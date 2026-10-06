import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  ensureLibraryDir,
  inferTypeFromMimeOrName,
  LIBRARY_DIR,
  readLibraryFile,
  resolveLibraryPath,
  writeLibraryFile,
} from "@/lib/library-store";
import { nowIso } from "@/lib/store";

const MAX_BYTES = 15 * 1024 * 1024; // 15 MB

const ALLOWED = new Set([
  ".pdf",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".doc",
  ".docx",
  ".txt",
  ".rtf",
  ".odt",
  ".md",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
]);

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readLibraryFile();
  const item = file.items.find((i) => i.id === params.id);
  if (!item?.filePath) {
    return NextResponse.json({ error: "No file" }, { status: 404 });
  }
  const abs = resolveLibraryPath(item.filePath);
  if (!abs) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const buf = await fs.readFile(abs);
    const type = item.mimeType || "application/octet-stream";
    const disposition =
      item.type === "image" ? "inline" : "attachment";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `${disposition}; filename="${item.fileName || path.basename(abs)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "File missing" }, { status: 404 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readLibraryFile();
  const idx = file.items.findIndex((i) => i.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const upload = form.get("file");
  if (!upload || typeof upload === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const blob = upload as File;
  const ext = path.extname(blob.name || "").toLowerCase() || "";
  if (ext && !ALLOWED.has(ext)) {
    return NextResponse.json(
      { error: "File type not allowed" },
      { status: 400 }
    );
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max 15 MB" }, { status: 400 });
  }

  await ensureLibraryDir();
  const item = file.items[idx];

  if (item.filePath) {
    const prev = resolveLibraryPath(item.filePath);
    if (prev) {
      try {
        await fs.unlink(prev);
      } catch {
        /* ignore */
      }
    }
  }

  const filename = `${item.id}-${Date.now()}${ext || ""}`;
  const abs = path.join(LIBRARY_DIR, filename);
  const buf = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(abs, buf);

  const mime = blob.type || "application/octet-stream";
  const inferred = inferTypeFromMimeOrName(mime, blob.name || filename);

  item.filePath = path
    .join("data", "uploads", "library", filename)
    .replace(/\\/g, "/");
  item.fileName = safeName(blob.name || filename);
  item.mimeType = mime;
  if (item.type === "link" || item.type === "other") {
    item.type = inferred;
  } else if (!item.filePath) {
    item.type = inferred;
  } else {
    // Prefer inferred when uploading over a link stub
    if (item.type === "document" || item.type === "image" || item.type === "pdf") {
      item.type = inferred;
    }
  }
  item.updatedAt = nowIso();
  file.items[idx] = item;
  await writeLibraryFile(file);
  return NextResponse.json(item);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readLibraryFile();
  const idx = file.items.findIndex((i) => i.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = file.items[idx];
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
  item.filePath = null;
  item.fileName = null;
  item.mimeType = null;
  item.updatedAt = nowIso();
  file.items[idx] = item;
  await writeLibraryFile(file);
  return NextResponse.json(item);
}
