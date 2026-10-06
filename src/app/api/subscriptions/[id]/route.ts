import { NextRequest, NextResponse } from "next/server";
import {
  bumpRenewalDate,
  readClientsFile,
  writeClientsFile,
} from "@/lib/clients-store";
import { readProjectsFile } from "@/lib/projects-store";
import { nowIso, uid } from "@/lib/store";
import { BillingPeriod, SubscriptionStatus } from "@/lib/types";

const STATUSES: SubscriptionStatus[] = ["active", "past_due", "cancelled", "trial"];
const PERIODS: BillingPeriod[] = ["monthly", "yearly", "custom"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readClientsFile();
  const sub = file.subscriptions.find((s) => s.id === params.id);
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(sub);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readClientsFile();
  const idx = file.subscriptions.findIndex((s) => s.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.subscriptions[idx] };

  // Mark renewed: bump renewal + optional payment + set active
  if (body.action === "renew") {
    next.renewalDate = bumpRenewalDate(next.renewalDate || next.startDate, next.billingPeriod);
    next.status = "active";
    next.updatedAt = nowIso();
    file.subscriptions[idx] = next;

    if (body.recordPayment !== false) {
      file.payments.unshift({
        id: uid("pay"),
        clientId: next.clientId,
        subscriptionId: next.id,
        amount: Number(body.amount ?? next.amount) || next.amount,
        currency: String(body.currency || next.currency),
        date: String(body.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
        method: String(body.method || "Card"),
        status: "paid",
        reference: String(body.reference || ""),
        notes: String(body.notes || "Renewal payment"),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    await writeClientsFile(file);
    return NextResponse.json(next);
  }

  if (typeof body.plan === "string") next.plan = body.plan.trim();
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.startDate === "string") next.startDate = body.startDate.slice(0, 10);
  if (typeof body.renewalDate === "string") next.renewalDate = body.renewalDate.slice(0, 10);
  if (body.amount !== undefined) next.amount = Number(body.amount) || 0;
  if (typeof body.currency === "string") next.currency = body.currency.trim() || "USD";
  if (PERIODS.includes(body.billingPeriod)) next.billingPeriod = body.billingPeriod;
  if (typeof body.notes === "string") next.notes = body.notes;
  if (typeof body.clientId === "string") next.clientId = body.clientId;
  if (typeof body.projectId === "string") {
    const projects = await readProjectsFile();
    const project = projects.projects.find((p) => p.id === body.projectId);
    if (!project || project.status !== "live") {
      return NextResponse.json(
        { error: "projectId must be a live/released project" },
        { status: 400 }
      );
    }
    next.projectId = body.projectId;
  }

  next.updatedAt = nowIso();
  file.subscriptions[idx] = next;
  await writeClientsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readClientsFile();
  const before = file.subscriptions.length;
  file.subscriptions = file.subscriptions.filter((s) => s.id !== params.id);
  if (file.subscriptions.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeClientsFile(file);
  return NextResponse.json({ ok: true });
}
