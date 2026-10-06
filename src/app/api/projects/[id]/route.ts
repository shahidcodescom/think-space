import { NextRequest, NextResponse } from "next/server";
import { readProjectsFile, writeProjectsFile } from "@/lib/projects-store";
import { nowIso } from "@/lib/store";
import { ProjectStatus } from "@/lib/types";

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeStatus(raw: unknown): ProjectStatus | null {
  const s = String(raw || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "live" || s === "released") return "live";
  if (s === "in_progress" || s === "in-progress" || s === "progress") {
    return "in_progress";
  }
  return null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readProjectsFile();
  const project = file.projects.find((p) => p.id === params.id);
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(project);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readProjectsFile();
  const idx = file.projects.findIndex((p) => p.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const current = file.projects[idx];
  const next = { ...current };

  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (typeof body.description === "string") next.description = body.description;
  if (typeof body.url === "string") next.url = body.url.trim();
  if (body.tags !== undefined) next.tags = parseTags(body.tags);
  if (typeof body.startedAt === "string") next.startedAt = body.startedAt.slice(0, 10);
  if (typeof body.releasedAt === "string") next.releasedAt = body.releasedAt.slice(0, 10);
  if (typeof body.notes === "string") next.notes = body.notes;

  if (body.status !== undefined) {
    const status = normalizeStatus(body.status);
    if (status) {
      next.status = status;
      if (status === "live" && !next.releasedAt) {
        next.releasedAt = new Date().toISOString().slice(0, 10);
      }
    }
  }

  next.updatedAt = nowIso();
  file.projects[idx] = next;
  await writeProjectsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readProjectsFile();
  const before = file.projects.length;
  file.projects = file.projects.filter((p) => p.id !== params.id);
  if (file.projects.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeProjectsFile(file);
  return NextResponse.json({ ok: true });
}
