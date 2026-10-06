import { promises as fs } from "fs";
import path from "path";
import { FinanceTransaction } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "finance.json");

export type FinanceFile = { transactions: FinanceTransaction[] };

export async function readFinanceFile(): Promise<FinanceFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as FinanceFile;
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: FinanceFile = { transactions: [] };
      await writeFinanceFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeFinanceFile(data: FinanceFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

/** Remaining balance on a lend/due. */
export function remainingAmount(tx: FinanceTransaction): number {
  if (tx.type !== "lend" && tx.type !== "due") return 0;
  return Math.max(0, tx.amount - (tx.amountSettled || 0));
}

export function summarizeMonth(
  transactions: FinanceTransaction[],
  month: string // YYYY-MM
) {
  const inMonth = transactions.filter((t) => t.date.startsWith(month));
  let income = 0;
  let expenses = 0;
  for (const t of inMonth) {
    if (t.type === "income") income += t.amount;
    if (t.type === "expense") expenses += t.amount;
  }
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
    outstandingLends,
    outstandingDues,
    openLendCount: openLends.length,
    openDueCount: openDues.length,
    transactionCount: inMonth.length,
  };
}
