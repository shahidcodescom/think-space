import { NextRequest, NextResponse } from "next/server";
import { readRecurringsFile, writeRecurringsFile } from "@/lib/recurrings-store";
import { nowIso, uid } from "@/lib/store";
import {
  Recurring,
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

function normalize(body: Record<string, unknown>, base?: Recurring): Recurring {
  const category = CATEGORIES.includes(body.category as RecurringCategory)
    ? (body.category as RecurringCategory)
    : base?.category || "Other";
  const billingPeriod = PERIODS.includes(body.billingPeriod as RecurringPeriod)
    ? (body.billingPeriod as RecurringPeriod)
    : base?.billingPeriod || "monthly";
  const status = STATUSES.includes(body.status as RecurringStatus)
    ? (body.status as RecurringStatus)
    : base?.status || "active";

  let amount = base?.amount ?? 0;
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    amount = Number.isFinite(n) ? n : 0;
  }

  return {
    id: base?.id || uid("rec"),
    name: String(body.name ?? base?.name ?? "Untitled").trim() || "Untitled",
    category,
    amount,
    currency: String(body.currency ?? base?.currency ?? "USD").trim() || "USD",
    billingPeriod,
    nextDueDate: String(body.nextDueDate ?? base?.nextDueDate ?? "")
      .slice(0, 10),
    status,
    paymentMethod: String(body.paymentMethod ?? base?.paymentMethod ?? "").trim(),
    url: String(body.url ?? base?.url ?? "").trim(),
    notes: String(body.notes ?? base?.notes ?? ""),
    linkedSecretId:
      body.linkedSecretId === null || body.linkedSecretId === ""
        ? null
        : body.linkedSecretId !== undefined
          ? String(body.linkedSecretId)
          : base?.linkedSecretId ?? null,
    linkedProjectId:
      body.linkedProjectId === null || body.linkedProjectId === ""
        ? null
        : body.linkedProjectId !== undefined
          ? String(body.linkedProjectId)
          : base?.linkedProjectId ?? null,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const category = searchParams.get("category");
  const upcoming = searchParams.get("upcoming");
  const q = (searchParams.get("q") || "").toLowerCase().trim();

  const file = await readRecurringsFile();
  let items = file.recurrings;

  if (status && STATUSES.includes(status as RecurringStatus)) {
    items = items.filter((r) => r.status === status);
  }
  if (category && CATEGORIES.includes(category as RecurringCategory)) {
    items = items.filter((r) => r.category === category);
  }
  if (q) {
    items = items.filter((r) =>
      `${r.name} ${r.category} ${r.notes} ${r.paymentMethod}`.toLowerCase().includes(q)
    );
  }
  if (upcoming) {
    const days = Number(upcoming) || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    items = items.filter((r) => {
      if (r.status === "cancelled" || !r.nextDueDate) return false;
      const d = new Date(`${r.nextDueDate}T12:00:00`);
      if (d < today) return true; // overdue
      return d >= today && d <= end;
    });
  }

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readRecurringsFile();
  file.recurrings.unshift(item);
  await writeRecurringsFile(file);
  return NextResponse.json(item, { status: 201 });
}
