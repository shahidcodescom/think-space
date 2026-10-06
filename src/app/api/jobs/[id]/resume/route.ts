import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  ensureResumesDir,
  readJobsFile,
  RESUMES_DIR,
  resolveResumePath,
  writeJobsFile,
} from "@/lib/jobs-store";
import { nowIso } from "@/lib/store";

const ALLOWED_EXT = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".txt",
  ".rtf",
  ".odt",
]);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readJobsFile();
  const job = file.jobs.find((j) => j.id === params.id);
  if (!job?.resumePath) {
    return NextResponse.json({ error: "No resume" }, { status: 404 });
  }
  const abs = resolveResumePath(job.resumePath);
  if (!abs) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }
  try {
    const buf = await fs.readFile(abs);
    const ext = path.extname(abs).toLowerCase();
    const type =
      ext === ".pdf"
        ? "application/pdf"
        : ext === ".txt"
          ? "text/plain"
          : "application/octet-stream";
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Content-Disposition": `attachment; filename="${job.resumeName || path.basename(abs)}"`,
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
  const file = await readJobsFile();
  const idx = file.jobs.findIndex((j) => j.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const form = await req.formData();
  const upload = form.get("file");
  if (!upload || typeof upload === "string") {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }
  const blob = upload as File;
  const ext = path.extname(blob.name || "").toLowerCase() || ".pdf";
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: "Allowed: pdf, doc, docx, txt, rtf, odt" },
      { status: 400 }
    );
  }
  if (blob.size > MAX_BYTES) {
    return NextResponse.json({ error: "Max 8 MB" }, { status: 400 });
  }

  await ensureResumesDir();
  const job = file.jobs[idx];

  // Remove previous file if any
  if (job.resumePath) {
    const prev = resolveResumePath(job.resumePath);
    if (prev) {
      try {
        await fs.unlink(prev);
      } catch {
        /* ignore */
      }
    }
  }

  const filename = `${job.id}-${Date.now()}${ext}`;
  const abs = path.join(RESUMES_DIR, filename);
  const buf = Buffer.from(await blob.arrayBuffer());
  await fs.writeFile(abs, buf);

  const relative = path.join("data", "uploads", "resumes", filename).replace(/\\/g, "/");
  job.resumePath = relative;
  job.resumeName = safeName(blob.name || filename);
  job.updatedAt = nowIso();
  // If still early-stage, nudge toward applied when uploading resume
  if (job.status === "enquired") {
    job.status = "applied";
  }
  file.jobs[idx] = job;
  await writeJobsFile(file);

  return NextResponse.json(job);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readJobsFile();
  const idx = file.jobs.findIndex((j) => j.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const job = file.jobs[idx];
  if (job.resumePath) {
    const abs = resolveResumePath(job.resumePath);
    if (abs) {
      try {
        await fs.unlink(abs);
      } catch {
        /* ignore */
      }
    }
  }
  job.resumePath = null;
  job.resumeName = null;
  job.updatedAt = nowIso();
  file.jobs[idx] = job;
  await writeJobsFile(file);
  return NextResponse.json(job);
}
