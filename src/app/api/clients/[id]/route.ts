import { NextRequest, NextResponse } from "next/server";
import { readClientsFile, writeClientsFile } from "@/lib/clients-store";
import { nowIso } from "@/lib/store";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readClientsFile();
  const client = file.clients.find((c) => c.id === params.id);
  if (!client) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const subscriptions = file.subscriptions.filter((s) => s.clientId === params.id);
  const payments = file.payments.filter((p) => p.clientId === params.id);
  return NextResponse.json({ ...client, subscriptions, payments });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readClientsFile();
  const idx = file.clients.findIndex((c) => c.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const next = { ...file.clients[idx] };
  if (typeof body.name === "string" && body.name.trim()) next.name = body.name.trim();
  if (typeof body.email === "string") next.email = body.email.trim();
  if (typeof body.company === "string") next.company = body.company.trim();
  if (typeof body.notes === "string") next.notes = body.notes;
  next.updatedAt = nowIso();
  file.clients[idx] = next;
  await writeClientsFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readClientsFile();
  const before = file.clients.length;
  file.clients = file.clients.filter((c) => c.id !== params.id);
  if (file.clients.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  // Keep historical payments/subs but unlink soft — delete related for demo simplicity
  file.subscriptions = file.subscriptions.filter((s) => s.clientId !== params.id);
  file.payments = file.payments.filter((p) => p.clientId !== params.id);
  await writeClientsFile(file);
  return NextResponse.json({ ok: true });
}
