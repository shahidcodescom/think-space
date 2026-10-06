import { NextRequest, NextResponse } from "next/server";
import { readClientsFile, writeClientsFile } from "@/lib/clients-store";
import { readProjectsFile } from "@/lib/projects-store";
import { nowIso, uid } from "@/lib/store";
import { BillingPeriod, SubscriptionStatus } from "@/lib/types";

const STATUSES: SubscriptionStatus[] = ["active", "past_due", "cancelled", "trial"];
const PERIODS: BillingPeriod[] = ["monthly", "yearly", "custom"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const projectId = searchParams.get("projectId");
  const clientId = searchParams.get("clientId");
  const upcoming = searchParams.get("upcoming"); // days window
  const file = await readClientsFile();
  let subs = file.subscriptions;

  if (status && STATUSES.includes(status as SubscriptionStatus)) {
    subs = subs.filter((s) => s.status === status);
  }
  if (projectId) subs = subs.filter((s) => s.projectId === projectId);
  if (clientId) subs = subs.filter((s) => s.clientId === clientId);

  if (upcoming) {
    const days = Number(upcoming) || 30;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + days);
    subs = subs.filter((s) => {
      if (!s.renewalDate) return false;
      if (s.status === "cancelled") return false;
      const d = new Date(`${s.renewalDate}T12:00:00`);
      return d >= today && d <= end;
    });
  }

  return NextResponse.json(subs);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clientId = String(body.clientId || "");
  const projectId = String(body.projectId || "");
  if (!clientId || !projectId) {
    return NextResponse.json(
      { error: "clientId and projectId are required" },
      { status: 400 }
    );
  }

  const projects = await readProjectsFile();
  const project = projects.projects.find((p) => p.id === projectId);
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 400 });
  }
  if (project.status !== "live") {
    return NextResponse.json(
      { error: "Subscriptions must link to a live/released project" },
      { status: 400 }
    );
  }

  const file = await readClientsFile();
  if (!file.clients.some((c) => c.id === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }

  const status = STATUSES.includes(body.status)
    ? body.status
    : ("active" as SubscriptionStatus);
  const billingPeriod = PERIODS.includes(body.billingPeriod)
    ? body.billingPeriod
    : ("monthly" as BillingPeriod);

  const sub = {
    id: uid("sub"),
    clientId,
    projectId,
    plan: String(body.plan || "Standard").trim() || "Standard",
    status,
    startDate: String(body.startDate || new Date().toISOString().slice(0, 10)).slice(0, 10),
    renewalDate: String(body.renewalDate || "").slice(0, 10),
    amount: Number(body.amount) || 0,
    currency: String(body.currency || "USD").trim() || "USD",
    billingPeriod,
    notes: String(body.notes || ""),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  file.subscriptions.unshift(sub);
  await writeClientsFile(file);
  return NextResponse.json(sub, { status: 201 });
}
