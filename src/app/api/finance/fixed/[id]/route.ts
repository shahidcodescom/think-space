import { NextRequest, NextResponse } from "next/server";
import { readFinanceFile, writeFinanceFile } from "@/lib/finance-store";
import { nowIso } from "@/lib/store";
import { FinanceFixedItem, FinanceFixedKind } from "@/lib/types";

const KINDS: FinanceFixedKind[] = ["income", "expense"];

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readFinanceFile();
  const idx = file.fixedItems.findIndex((f) => f.id === params.id);
  if (idx < 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const current = file.fixedItems[idx];
  const next: FinanceFixedItem = { ...current, updatedAt: nowIso() };

  if (typeof body.name === "string" && body.name.trim()) {
    next.name = body.name.trim();
  }
  if (KINDS.includes(body.kind as FinanceFixedKind)) {
    next.kind = body.kind as FinanceFixedKind;
  }
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    if (Number.isFinite(n) && n >= 0) next.amount = n;
  }
  if (typeof body.currency === "string" && body.currency.trim()) {
    next.currency = body.currency.trim();
  }
  if (typeof body.category === "string") {
    next.category = body.category.trim() || "Other";
  }
  if (typeof body.notes === "string") next.notes = body.notes;
  if (typeof body.active === "boolean") next.active = body.active;

  file.fixedItems[idx] = next;
  await writeFinanceFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readFinanceFile();
  const before = file.fixedItems.length;
  file.fixedItems = file.fixedItems.filter((f) => f.id !== params.id);
  if (file.fixedItems.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeFinanceFile(file);
  return NextResponse.json({ ok: true });
}
