import { NextRequest, NextResponse } from "next/server";
import { readClientsFile, writeClientsFile } from "@/lib/clients-store";
import { nowIso } from "@/lib/store";
import { PaymentStatus } from "@/lib/types";

const STATUSES: PaymentStatus[] = ["paid", "failed", "pending", "refunded"];

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readClientsFile();
  const idx = file.payments.findIndex((p) => p.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = { ...file.payments[idx] };
  if (body.amount !== undefined) next.amount = Number(body.amount) || 0;
  if (typeof body.currency === "string") next.currency = body.currency.trim() || "USD";
  if (typeof body.date === "string") next.date = body.date.slice(0, 10);
  if (typeof body.method === "string") next.method = body.method.trim();
  if (STATUSES.includes(body.status)) next.status = body.status;
  if (typeof body.reference === "string") next.reference = body.reference;
  if (typeof body.notes === "string") next.notes = body.notes;
  next.updatedAt = nowIso();
  file.payments[idx] = next;
  await writeClientsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readClientsFile();
  const before = file.payments.length;
  file.payments = file.payments.filter((p) => p.id !== params.id);
  if (file.payments.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeClientsFile(file);
  return NextResponse.json({ ok: true });
}
