import { NextRequest, NextResponse } from "next/server";
import {
  bumpDueDate,
  readRecurringsFile,
  writeRecurringsFile,
} from "@/lib/recurrings-store";
import { nowIso } from "@/lib/store";
import {
  RecurringCategory,
  RecurringPeriod,
  RecurringStatus,
} from "@/lib/types";

const CATEGORIES: RecurringCategory[] = [
  "Software",
  "Media",
  "Domain",
  "Utilities",
  "Other",
];
const PERIODS: RecurringPeriod[] = ["weekly", "monthly", "yearly", "custom"];
const STATUSES: RecurringStatus[] = ["active", "paused", "cancelled"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readRecurringsFile();
  const item = file.recurrings.find((r) => r.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readRecurringsFile();
  const idx = file.recurrings.findIndex((r) => r.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.recurrings[idx] };

  if (body.action === "mark_paid") {
    next.nextDueDate = bumpDueDate(
      next.nextDueDate || new Date().toISOString().slice(0, 10),
      next.billingPeriod
    );
    if (next.status === "paused") next.status = "active";
    next.updatedAt = nowIso();
    file.recurrings[idx] = next;
    await writeRecurringsFile(file);
    return NextResponse.json(next);
  }

  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (CATEGORIES.includes(body.category)) next.category = body.category;
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    next.amount = Number.isFinite(n) ? n : next.amount;
  }
  if (typeof body.currency === "string") {
    next.currency = body.currency.trim() || "USD";
  }
  if (PERIODS.includes(body.billingPeriod)) next.billingPeriod = body.billingPeriod;
  if (typeof body.nextDueDate === "string") {
    next.nextDueDate = body.nextDueDate.slice(0, 10);
  }
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.paymentMethod === "string") {
    next.paymentMethod = body.paymentMethod.trim();
  }
  if (typeof body.url === "string") next.url = body.url.trim();
  if (typeof body.notes === "string") next.notes = body.notes;
  if (body.linkedSecretId !== undefined) {
    next.linkedSecretId =
      body.linkedSecretId === null || body.linkedSecretId === ""
        ? null
        : String(body.linkedSecretId);
  }
  if (body.linkedProjectId !== undefined) {
    next.linkedProjectId =
      body.linkedProjectId === null || body.linkedProjectId === ""
        ? null
        : String(body.linkedProjectId);
  }

  next.updatedAt = nowIso();
  file.recurrings[idx] = next;
  await writeRecurringsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readRecurringsFile();
  const before = file.recurrings.length;
  file.recurrings = file.recurrings.filter((r) => r.id !== params.id);
  if (file.recurrings.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeRecurringsFile(file);
  return NextResponse.json({ ok: true });
}
