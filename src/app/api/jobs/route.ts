import { NextRequest, NextResponse } from "next/server";
import { readJobsFile, writeJobsFile } from "@/lib/jobs-store";
import { nowIso, uid } from "@/lib/store";
import { JOB_STATUSES, JobApplication, JobStatus } from "@/lib/types";

function normalize(
  body: Record<string, unknown>,
  base?: JobApplication
): JobApplication {
  const status = JOB_STATUSES.includes(body.status as JobStatus)
    ? (body.status as JobStatus)
    : base?.status || "applied";

  return {
    id: base?.id || uid("job"),
    company: String(body.company ?? base?.company ?? "").trim() || "Untitled",
    role: String(body.role ?? base?.role ?? "").trim() || "Role",
    location: String(body.location ?? base?.location ?? "").trim(),
    remote:
      body.remote !== undefined
        ? Boolean(body.remote)
        : base?.remote ?? false,
    sourceUrl: String(body.sourceUrl ?? base?.sourceUrl ?? "").trim(),
    jdHtml: String(body.jdHtml ?? base?.jdHtml ?? ""),
    status,
    appliedDate: String(
      body.appliedDate ?? base?.appliedDate ?? new Date().toISOString().slice(0, 10)
    ).slice(0, 10),
    nextInterviewAt: String(
      body.nextInterviewAt ?? base?.nextInterviewAt ?? ""
    ),
    salaryNotes: String(body.salaryNotes ?? base?.salaryNotes ?? ""),
    contacts: String(body.contacts ?? base?.contacts ?? ""),
    notes: String(body.notes ?? base?.notes ?? ""),
    resumePath:
      body.resumePath !== undefined
        ? body.resumePath === null || body.resumePath === ""
          ? null
          : String(body.resumePath)
        : base?.resumePath ?? null,
    resumeName:
      body.resumeName !== undefined
        ? body.resumeName === null || body.resumeName === ""
          ? null
          : String(body.resumeName)
        : base?.resumeName ?? null,
    linkedCalendarEventId:
      body.linkedCalendarEventId !== undefined
        ? body.linkedCalendarEventId === null || body.linkedCalendarEventId === ""
          ? null
          : String(body.linkedCalendarEventId)
        : base?.linkedCalendarEventId ?? null,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const file = await readJobsFile();
  let items = file.jobs;

  if (status && JOB_STATUSES.includes(status as JobStatus)) {
    items = items.filter((j) => j.status === status);
  }
  if (q) {
    items = items.filter((j) =>
      `${j.company} ${j.role} ${j.location} ${j.notes} ${j.contacts}`
        .toLowerCase()
        .includes(q)
    );
  }

  items = [...items].sort((a, b) =>
    (b.appliedDate || "").localeCompare(a.appliedDate || "")
  );
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.company || "").trim()) {
    return NextResponse.json({ error: "Company is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readJobsFile();
  file.jobs.unshift(item);
  await writeJobsFile(file);
  return NextResponse.json(item, { status: 201 });
}
