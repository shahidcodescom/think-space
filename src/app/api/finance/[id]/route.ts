import { NextRequest, NextResponse } from "next/server";
import { remainingAmount, readFinanceFile, writeFinanceFile } from "@/lib/finance-store";
import { nowIso } from "@/lib/store";
import { FinanceSettleStatus, FinanceTxType } from "@/lib/types";

const TYPES: FinanceTxType[] = ["income", "expense", "lend", "due"];
const STATUSES: FinanceSettleStatus[] = ["open", "partial", "settled"];

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readFinanceFile();
  const item = file.transactions.find((t) => t.id === params.id);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const file = await readFinanceFile();
  const idx = file.transactions.findIndex((t) => t.id === params.id);
  if (idx < 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const next = { ...file.transactions[idx] };

  if (body.action === "settle") {
    if (next.type !== "lend" && next.type !== "due") {
      return NextResponse.json(
        { error: "Only lend/due can be settled" },
        { status: 400 }
      );
    }
    next.amountSettled = next.amount;
    next.status = "settled";
    next.updatedAt = nowIso();
    file.transactions[idx] = next;
    await writeFinanceFile(file);
    return NextResponse.json(next);
  }

  if (body.action === "repay") {
    if (next.type !== "lend" && next.type !== "due") {
      return NextResponse.json(
        { error: "Only lend/due accept repayments" },
        { status: 400 }
      );
    }
    const pay = Number(body.amount);
    if (!Number.isFinite(pay) || pay <= 0) {
      return NextResponse.json({ error: "Repayment amount required" }, { status: 400 });
    }
    const rem = remainingAmount(next);
    const applied = Math.min(pay, rem);
    next.amountSettled = (next.amountSettled || 0) + applied;
    if (next.amountSettled >= next.amount) {
      next.amountSettled = next.amount;
      next.status = "settled";
    } else if (next.amountSettled > 0) {
      next.status = "partial";
    } else {
      next.status = "open";
    }
    next.updatedAt = nowIso();
    file.transactions[idx] = next;
    await writeFinanceFile(file);
    return NextResponse.json(next);
  }

  if (TYPES.includes(body.type)) next.type = body.type;
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    if (Number.isFinite(n)) next.amount = Math.max(0, n);
  }
  if (typeof body.currency === "string") {
    next.currency = body.currency.trim() || "INR";
  }
  if (typeof body.date === "string") next.date = body.date.slice(0, 10);
  if (typeof body.category === "string") {
    next.category = body.category.trim() || "Other";
  }
  if (typeof body.counterparty === "string") {
    next.counterparty = body.counterparty.trim();
  }
  if (typeof body.notes === "string") next.notes = body.notes;
  if (body.linkedRecurringId !== undefined) {
    next.linkedRecurringId =
      body.linkedRecurringId === null || body.linkedRecurringId === ""
        ? null
        : String(body.linkedRecurringId);
  }
  if (next.type === "lend" || next.type === "due") {
    if (body.amountSettled !== undefined) {
      const n = Number(body.amountSettled);
      if (Number.isFinite(n)) next.amountSettled = Math.max(0, n);
    }
    if (STATUSES.includes(body.status)) next.status = body.status;
    else if (next.amountSettled >= next.amount && next.amount > 0) next.status = "settled";
    else if (next.amountSettled > 0) next.status = "partial";
    else if (!next.status) next.status = "open";
  } else {
    next.status = null;
    next.amountSettled = 0;
  }

  next.updatedAt = nowIso();
  file.transactions[idx] = next;
  await writeFinanceFile(file);
  return NextResponse.json(next);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const file = await readFinanceFile();
  const before = file.transactions.length;
  file.transactions = file.transactions.filter((t) => t.id !== params.id);
  if (file.transactions.length === before) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await writeFinanceFile(file);
  return NextResponse.json({ ok: true });
}
