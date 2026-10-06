import { NextRequest, NextResponse } from "next/server";
import { readClientsFile, writeClientsFile } from "@/lib/clients-store";
import { nowIso, uid } from "@/lib/store";

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get("q") || "").toLowerCase().trim();
  const file = await readClientsFile();
  let clients = file.clients;
  if (q) {
    clients = clients.filter((c) =>
      `${c.name} ${c.email} ${c.company} ${c.notes}`.toLowerCase().includes(q)
    );
  }
  return NextResponse.json(clients);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body.name || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const client = {
    id: uid("client"),
    name,
    email: String(body.email || "").trim(),
    company: String(body.company || "").trim(),
    notes: String(body.notes || ""),
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  const file = await readClientsFile();
  file.clients.unshift(client);
  await writeClientsFile(file);
  return NextResponse.json(client, { status: 201 });
}
