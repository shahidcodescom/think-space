import { NextRequest, NextResponse } from "next/server";
import { readProjectsFile, writeProjectsFile } from "@/lib/projects-store";
import { nowIso, uid } from "@/lib/store";
import { Project, ProjectStatus } from "@/lib/types";

const STATUSES: ProjectStatus[] = ["in_progress", "live"];

function parseTags(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.map(String).map((s) => s.trim()).filter(Boolean);
  }
  return String(input || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeStatus(raw: unknown, fallback: ProjectStatus = "in_progress"): ProjectStatus {
  const s = String(raw || "").toLowerCase().replace(/\s+/g, "_");
  if (s === "live" || s === "released") return "live";
  if (s === "in_progress" || s === "in-progress" || s === "progress") {
    return "in_progress";
  }
  return STATUSES.includes(raw as ProjectStatus) ? (raw as ProjectStatus) : fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const file = await readProjectsFile();
  let projects = file.projects;

  if (status) {
    const normalized = normalizeStatus(status, status as ProjectStatus);
    if (STATUSES.includes(normalized)) {
      projects = projects.filter((p) => p.status === normalized);
    }
  }
  if (q) {
    projects = projects.filter((p) => {
      const hay = `${p.name} ${p.description} ${p.tags.join(" ")} ${p.notes}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const status = normalizeStatus(body.status, "in_progress");
  const project: Project = {
    id: uid("project"),
    name,
    description: String(body.description || ""),
    status,
    url: String(body.url || "").trim(),
    tags: parseTags(body.tags),
    startedAt: String(body.startedAt || "").slice(0, 10),
    releasedAt:
      status === "live"
        ? String(body.releasedAt || new Date().toISOString().slice(0, 10)).slice(0, 10)
        : String(body.releasedAt || "").slice(0, 10),
    notes: String(body.notes || ""),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  const file = await readProjectsFile();
  file.projects.unshift(project);
  await writeProjectsFile(file);
  return NextResponse.json(project, { status: 201 });
}
