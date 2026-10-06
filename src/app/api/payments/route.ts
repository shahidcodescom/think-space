import { NextRequest, NextResponse } from "next/server";
import { readClientsFile, writeClientsFile } from "@/lib/clients-store";
import { nowIso, uid } from "@/lib/store";
import { PaymentStatus } from "@/lib/types";

const STATUSES: PaymentStatus[] = ["paid", "failed", "pending", "refunded"];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get("clientId");
  const subscriptionId = searchParams.get("subscriptionId");
  const file = await readClientsFile();
  let payments = file.payments;
  if (clientId) payments = payments.filter((p) => p.clientId === clientId);
  if (subscriptionId) {
    payments = payments.filter((p) => p.subscriptionId === subscriptionId);
  }
  return NextResponse.json(payments);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const clientId = String(body.clientId || "");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }
  const file = await readClientsFile();
  if (!file.clients.some((c) => c.id === clientId)) {
    return NextResponse.json({ error: "Client not found" }, { status: 400 });
  }
  const subscriptionId = body.subscriptionId ? String(body.subscriptionId) : null;
  if (subscriptionId && !file.subscriptions.some((s) => s.id === subscriptionId)) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 400 });
  }

  const payment = {
    id: uid("pay"),
    clientId,
    subscriptionId,
    amount: Number(body.amount) || 0,
    currency: String(body.currency || "USD").trim() || "USD",
    date: String(body.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
    method: String(body.method || "Card").trim() || "Card",
    status: (STATUSES.includes(body.status) ? body.status : "paid") as PaymentStatus,
    reference: String(body.reference || ""),
    notes: String(body.notes || ""),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };

  file.payments.unshift(payment);
  await writeClientsFile(file);
  return NextResponse.json(payment, { status: 201 });
}
