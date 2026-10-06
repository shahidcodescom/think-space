import { NextRequest, NextResponse } from "next/server";
import { readSkillsFile, writeSkillsFile } from "@/lib/skills-store";
import { nowIso, uid } from "@/lib/store";
import {
  Skill,
  SkillProficiency,
  SkillStatus,
} from "@/lib/types";

const STATUSES: SkillStatus[] = ["have", "learning", "planned"];
const PROFICIENCIES: SkillProficiency[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
];

function normalize(
  body: Record<string, unknown>,
  base?: Skill
): Skill {
  const status = STATUSES.includes(body.status as SkillStatus)
    ? (body.status as SkillStatus)
    : base?.status || "planned";

  let proficiency: SkillProficiency | null = null;
  if (status === "have" || status === "learning") {
    if (PROFICIENCIES.includes(body.proficiency as SkillProficiency)) {
      proficiency = body.proficiency as SkillProficiency;
    } else if (base?.proficiency) {
      proficiency = base.proficiency;
    } else if (status === "have") {
      proficiency = "intermediate";
    }
  }

  let priority: number | null = null;
  if (status === "learning" || status === "planned") {
    if (body.priority !== undefined && body.priority !== null && body.priority !== "") {
      const n = Number(body.priority);
      priority = Number.isFinite(n) ? Math.min(5, Math.max(1, Math.round(n))) : 3;
    } else if (base?.priority != null) {
      priority = base.priority;
    } else {
      priority = 3;
    }
  }

  return {
    id: base?.id || uid("sk"),
    name: String(body.name ?? base?.name ?? "Untitled").trim() || "Untitled",
    category: String(body.category ?? base?.category ?? "General").trim() || "General",
    status,
    proficiency,
    priority,
    notes: String(body.notes ?? base?.notes ?? ""),
    targetDate: String(body.targetDate ?? base?.targetDate ?? "").slice(0, 10),
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const file = await readSkillsFile();
  let items = file.skills;

  if (status && STATUSES.includes(status as SkillStatus)) {
    items = items.filter((s) => s.status === status);
  }
  if (q) {
    items = items.filter((s) =>
      `${s.name} ${s.category} ${s.notes}`.toLowerCase().includes(q)
    );
  }

  items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readSkillsFile();
  file.skills.unshift(item);
  await writeSkillsFile(file);
  return NextResponse.json(item, { status: 201 });
}
