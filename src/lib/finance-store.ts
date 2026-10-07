import { FinanceFixedItem, FinanceTransaction } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";
import { nowIso, uid } from "./store";

const KEY = "finance";

export type FinanceFile = {
  transactions: FinanceTransaction[];
  fixedItems: FinanceFixedItem[];
};

function seedFixedItems(): FinanceFixedItem[] {
  const ts = nowIso();
  return [
    {
      id: uid("fin-fix"),
      kind: "expense",
      name: "Rent",
      amount: 25000,
      currency: "INR",
      category: "Rent",
      notes: "Monthly house rent",
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid("fin-fix"),
      kind: "expense",
      name: "Internet",
      amount: 999,
      currency: "INR",
      category: "Utilities",
      notes: "Home broadband",
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
    {
      id: uid("fin-fix"),
      kind: "income",
      name: "Side retainer",
      amount: 15000,
      currency: "INR",
      category: "Freelance",
      notes: "Monthly retainer",
      active: true,
      createdAt: ts,
      updatedAt: ts,
    },
  ];
}

function normalizeFile(parsed: Partial<FinanceFile> | null): FinanceFile {
  const transactions = Array.isArray(parsed?.transactions)
    ? parsed!.transactions
    : [];
  let fixedItems = Array.isArray(parsed?.fixedItems) ? parsed!.fixedItems : [];
  if (!parsed || !("fixedItems" in parsed)) {
    fixedItems = seedFixedItems();
  }
  return { transactions, fixedItems };
}

export async function readFinanceFile(): Promise<FinanceFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<Partial<FinanceFile>>("finance.json");
    return normalizeFile(legacy);
  });
}

export async function writeFinanceFile(data: FinanceFile): Promise<void> {
  const payload: FinanceFile = {
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    fixedItems: Array.isArray(data.fixedItems) ? data.fixedItems : [],
  };
  await setDoc(KEY, payload);
}

export function remainingAmount(tx: FinanceTransaction): number {
  if (tx.type !== "lend" && tx.type !== "due") return 0;
  return Math.max(0, tx.amount - (tx.amountSettled || 0));
}

export function summarizeMonth(
  transactions: FinanceTransaction[],
  month: string,
  fixedItems: FinanceFixedItem[] = []
) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  let txnIncome = 0;
  let txnExpenses = 0;
  for (const t of inMonth) {
    if (t.type === "income") txnIncome += t.amount;
    if (t.type === "expense") txnExpenses += t.amount;
  }

  const activeFixed = fixedItems.filter((f) => f.active);
  const fixedIncome = activeFixed
    .filter((f) => f.kind === "income")
    .reduce((s, f) => s + f.amount, 0);
  const fixedExpenses = activeFixed
    .filter((f) => f.kind === "expense")
    .reduce((s, f) => s + f.amount, 0);

  const income = txnIncome + fixedIncome;
  const expenses = txnExpenses + fixedExpenses;

  const openLends = transactions.filter(
    (t) => t.type === "lend" && t.status !== "settled"
  );
  const openDues = transactions.filter(
    (t) => t.type === "due" && t.status !== "settled"
  );
  const outstandingLends = openLends.reduce((s, t) => s + remainingAmount(t), 0);
  const outstandingDues = openDues.reduce((s, t) => s + remainingAmount(t), 0);

  return {
    month,
    income,
    expenses,
    net: income - expenses,
    txnIncome,
    txnExpenses,
    fixedIncome,
    fixedExpenses,
    outstandingLends,
    outstandingDues,
    openLendCount: openLends.length,
    openDueCount: openDues.length,
    transactionCount: inMonth.length,
  };
}
