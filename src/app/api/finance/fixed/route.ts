import { NextRequest, NextResponse } from "next/server";
import { readFinanceFile, writeFinanceFile } from "@/lib/finance-store";
import { nowIso, uid } from "@/lib/store";
import { FinanceFixedItem, FinanceFixedKind } from "@/lib/types";

const KINDS: FinanceFixedKind[] = ["income", "expense"];

function normalize(
  body: Record<string, unknown>,
  base?: FinanceFixedItem
): FinanceFixedItem {
  const kind = KINDS.includes(body.kind as FinanceFixedKind)
    ? (body.kind as FinanceFixedKind)
    : base?.kind || "expense";

  let amount = base?.amount ?? 0;
  if (body.amount !== undefined) {
    const n = Number(body.amount);
    amount = Number.isFinite(n) ? Math.max(0, n) : 0;
  }

  let active = base?.active ?? true;
  if (typeof body.active === "boolean") active = body.active;

  return {
    id: base?.id || uid("fin-fix"),
    kind,
    name: String(body.name ?? base?.name ?? "").trim() || "Untitled",
    amount,
    currency: String(body.currency ?? base?.currency ?? "INR").trim() || "INR",
    category: String(body.category ?? base?.category ?? "Other").trim() || "Other",
    notes: String(body.notes ?? base?.notes ?? ""),
    active,
    createdAt: base?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const kind = searchParams.get("kind");
  const file = await readFinanceFile();
  let items = file.fixedItems;
  if (kind && KINDS.includes(kind as FinanceFixedKind)) {
    items = items.filter((f) => f.kind === kind);
  }
  items = [...items].sort((a, b) => a.name.localeCompare(b.name));
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!KINDS.includes(body.kind)) {
    return NextResponse.json({ error: "kind must be income or expense" }, { status: 400 });
  }
  if (!String(body.name || "").trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (body.amount === undefined || Number(body.amount) < 0) {
    return NextResponse.json({ error: "Amount is required" }, { status: 400 });
  }
  const item = normalize(body);
  const file = await readFinanceFile();
  file.fixedItems.unshift(item);
  await writeFinanceFile(file);
  return NextResponse.json(item, { status: 201 });
}
