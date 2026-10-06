import { NextRequest, NextResponse } from "next/server";
import { readSkillsFile, writeSkillsFile } from "@/lib/skills-store";
import { nowIso } from "@/lib/store";
import { SkillProficiency, SkillStatus } from "@/lib/types";

const STATUSES: SkillStatus[] = ["have", "learning", "planned"];
const PROFICIENCIES: SkillProficiency[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSkillsFile();
  const item = file.skills.find((s) => s.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readSkillsFile();
  const idx = file.skills.findIndex((s) => s.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.skills[idx] };

  if (body.action === "mark_have") {
    next.status = "have";
    next.proficiency =
      PROFICIENCIES.includes(body.proficiency) ? body.proficiency : next.proficiency || "intermediate";
    next.priority = null;
    next.updatedAt = nowIso();
    file.skills[idx] = next;
    await writeSkillsFile(file);
    return NextResponse.json(next);
  }

  if (body.action === "mark_learn") {
    next.status = body.status === "planned" ? "planned" : "learning";
    if (next.priority == null) next.priority = 3;
    next.updatedAt = nowIso();
    file.skills[idx] = next;
    await writeSkillsFile(file);
    return NextResponse.json(next);
  }

  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (typeof body.category === "string") {
    next.category = body.category.trim() || "General";
  }
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (body.proficiency === null) next.proficiency = null;
  else if (PROFICIENCIES.includes(body.proficiency)) next.proficiency = body.proficiency;
  if (body.priority === null) next.priority = null;
  else if (body.priority !== undefined) {
    const n = Number(body.priority);
    if (Number.isFinite(n)) next.priority = Math.min(5, Math.max(1, Math.round(n)));
  }
  if (typeof body.notes === "string") next.notes = body.notes;
  if (typeof body.targetDate === "string") next.targetDate = body.targetDate.slice(0, 10);

  // Keep fields consistent with status
  if (next.status === "have") {
    if (!next.proficiency) next.proficiency = "intermediate";
    next.priority = null;
  } else {
    if (next.priority == null) next.priority = 3;
  }

  next.updatedAt = nowIso();
  file.skills[idx] = next;
  await writeSkillsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readSkillsFile();
  const before = file.skills.length;
  file.skills = file.skills.filter((s) => s.id !== params.id);
  if (file.skills.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeSkillsFile(file);
  return NextResponse.json({ ok: true });
}
