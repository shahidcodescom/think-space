import { NextRequest, NextResponse } from "next/server";
import {
  readFinanceFile,
  summarizeMonth,
  writeFinanceFile,
} from "@/lib/finance-store";
import { nowIso, uid } from "@/lib/store";
import {
  FinanceSettleStatus,
  FinanceTransaction,
  FinanceTxType,
} from "@/lib/types";

const TYPES: FinanceTxType[] = ["income", "expense", "lend", "due"];
const STATUSES: FinanceSettleStatus[] = ["open", "partial", "settled"];

function normalize(
  body: Record<string, unknown>,
  base?: FinanceTransaction
): FinanceTransaction {
  const type = TYPES.includes(body.type as FinanceTxType)
    ? (body.type as FinanceTxType)
    : base?.type || "expense";

  let amount = base?.amount ?? 0;
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    amount = Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  let amountSettled = base?.amountSettled ?? 0;
  if (body.amountSettled !== undefined) {
    const n = Number(body.amountSettled);
    amountSettled = Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  let status: FinanceSettleStatus | null = null;
  if (type === "lend" || type === "due") {
    if (STATUSES.includes(body.status as FinanceSettleStatus)) {
      status = body.status as FinanceSettleStatus;
    } else if (base?.status) {
      status = base.status;
    } else {
      status = amountSettled >= amount && amount > 0 ? "settled" : amountSettled > 0 ? "partial" : "open";
    }
  }

  return {
    id: base?.id || uid("fin"),
    type,
    amount,
    currency: String(body.currency ?? base?.currency ?? "INR").trim() || "INR",
    date: String(body.date ?? base?.date ?? new Date().toISOString().slice(0, 10)).slice(0, 10),
    category: String(body.category ?? base?.category ?? "Other").trim() || "Other",
    counterparty: String(body.counterparty ?? base?.counterparty ?? "").trim(),
    status,
    amountSettled: type === "lend" || type === "due" ? amountSettled : 0,
    notes: String(body.notes ?? base?.notes ?? ""),
    linkedRecurringId:
      body.linkedRecurringId === null || body.linkedRecurringId === ""
        ? null
        : body.linkedRecurringId !== undefined
          ? String(body.linkedRecurringId)
          : base?.linkedRecurringId ?? null,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const month = searchParams.get("month"); // YYYY-MM
  const status = searchParams.get("status");
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const summary = searchParams.get("summary");

  const file = await readFinanceFile();
  let items = file.transactions;

  if (type && TYPES.includes(type as FinanceTxType)) {
    items = items.filter((t) => t.type === type);
  }
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    items = items.filter((t) => t.date.startsWith(month));
  }
  if (status && STATUSES.includes(status as FinanceSettleStatus)) {
    items = items.filter((t) => t.status === status);
  }
  if (q) {
    items = items.filter((t) =>
      `${t.category} ${t.counterparty} ${t.notes} ${t.type}`.toLowerCase().includes(q)
    );
  }

  items = [...items].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt));

  if (summary === "1" || summary === "true") {
    const m =
      month && /^\d{4}-\d{2}$/.test(month)
        ? month
        : new Date().toISOString().slice(0, 7);
    return NextResponse.json({
      transactions: items,
      summary: summarizeMonth(file.transactions, m),
    });
  }

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!TYPES.includes(body.type)) {
    return NextResponse.json({ error: "Valid type is required" }, { status: 400 });
  }
  if (body.amount === undefined || Number(body.amount) < 0) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readFinanceFile();
  file.transactions.unshift(item);
  await writeFinanceFile(file);
  return NextResponse.json(item, { status: 201 });
}
