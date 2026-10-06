import { NextRequest, NextResponse } from "next/server";
import { readCalendarFile, writeCalendarFile } from "@/lib/calendar-store";
import { readJobsFile, writeJobsFile } from "@/lib/jobs-store";
import { nowIso, uid } from "@/lib/store";
import { JOB_STATUSES, JobStatus } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readJobsFile();
  const item = file.jobs.find((j) => j.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readJobsFile();
  const idx = file.jobs.findIndex((j) => j.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.jobs[idx] };

  if (typeof body.company === "string" && body.company.trim()) {
    next.company = body.company.trim();
  }
  if (typeof body.role === "string") next.role = body.role.trim() || next.role;
  if (typeof body.location === "string") next.location = body.location.trim();
  if (body.remote !== undefined) next.remote = Boolean(body.remote);
  if (typeof body.sourceUrl === "string") next.sourceUrl = body.sourceUrl.trim();
  if (typeof body.jdHtml === "string") next.jdHtml = body.jdHtml;
  if (JOB_STATUSES.includes(body.status)) next.status = body.status as JobStatus;
  if (typeof body.appliedDate === "string") {
    next.appliedDate = body.appliedDate.slice(0, 10);
  }
  if (typeof body.nextInterviewAt === "string") {
    next.nextInterviewAt = body.nextInterviewAt;
  }
  if (typeof body.salaryNotes === "string") next.salaryNotes = body.salaryNotes;
  if (typeof body.contacts === "string") next.contacts = body.contacts;
  if (typeof body.notes === "string") next.notes = body.notes;
  if (body.linkedCalendarEventId !== undefined) {
    next.linkedCalendarEventId =
      body.linkedCalendarEventId === null || body.linkedCalendarEventId === ""
        ? null
        : String(body.linkedCalendarEventId);
  }

  // Optionally link interview to calendar when scheduling
  if (
    body.linkToCalendar === true &&
    next.nextInterviewAt &&
    !next.linkedCalendarEventId
  ) {
    try {
      const cal = await readCalendarFile();
      const start = new Date(next.nextInterviewAt);
      if (!Number.isNaN(start.getTime())) {
        const end = new Date(start.getTime() + 30 * 60000);
        const ev = {
          id: uid("cal"),
          title: `Interview · ${next.company} · ${next.role}`,
          type: "interview" as const,
          start: start.toISOString(),
          end: end.toISOString(),
          location: next.location || (next.remote ? "Remote" : ""),
          url: next.sourceUrl || "",
          notes: `Job ${next.id}`,
          status: "scheduled" as const,
          bookingSource: "owner" as const,
          bookerName: "",
          bookerEmail: "",
          createdAt: nowIso(),
          updatedAt: nowIso(),
        };
        cal.events.unshift(ev);
        await writeCalendarFile(cal);
        next.linkedCalendarEventId = ev.id;
      }
    } catch {
      // non-fatal
    }
  }

  next.updatedAt = nowIso();
  file.jobs[idx] = next;
  await writeJobsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readJobsFile();
  const before = file.jobs.length;
  file.jobs = file.jobs.filter((j) => j.id !== params.id);
  if (file.jobs.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeJobsFile(file);
  return NextResponse.json({ ok: true });
}
