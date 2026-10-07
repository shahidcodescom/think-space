import type { ChatMessage } from "./types";
import { getRedis } from "./redis";

const KEY = "bipolar:thinking:memory";
const MAX_STORED = 50;

export type MemoryTurn = {
  user: string;
  assistant: string;
  createdAt: string;
};

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

/** Push a completed user/assistant exchange into Redis (no-op if Redis down). */
export async function pushChatMemoryTurn(turn: MemoryTurn): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  try {
    await redis.lPush(KEY, JSON.stringify(turn));
    await redis.lTrim(KEY, 0, MAX_STORED - 1);
    return true;
  } catch {
    return false;
  }
}

/** Most recent turns, oldest → newest. Empty if Redis unavailable. */
export async function getChatMemoryTurns(n: number): Promise<MemoryTurn[]> {
  if (!Number.isFinite(n) || n <= 0) return [];
  const redis = await getRedis();
  if (!redis) return [];
  try {
    const raw = await redis.lRange(KEY, 0, Math.min(n, MAX_STORED) - 1);
    const turns: MemoryTurn[] = [];
    for (const item of raw) {
      try {
        const parsed = JSON.parse(item) as MemoryTurn;
        if (parsed?.user && parsed?.assistant) turns.push(parsed);
      } catch {
        /* skip bad */
      }
    }
    return turns.reverse();
  } catch {
    return [];
  }
}

export async function clearChatMemory(): Promise<boolean> {
  const redis = await getRedis();
  if (!redis) return false;
  try {
    await redis.del(KEY);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build last-N turns from Redis, or fall back to Postgres chatHistory.
 * N = number of user↔assistant exchanges.
 */
export async function loadRecentChatMemory(
  n: number,
  fallbackHistory: ChatMessage[] = []
): Promise<{ turns: MemoryTurn[]; source: "redis" | "store" | "none" }> {
  if (!Number.isFinite(n) || n <= 0) {
    return { turns: [], source: "none" };
  }

  const fromRedis = await getChatMemoryTurns(n);
  if (fromRedis.length) {
    return { turns: fromRedis, source: "redis" };
  }

  // Fallback: derive turns from durable chatHistory (user then assistant pairs)
  const pairs: MemoryTurn[] = [];
  for (let i = 0; i < fallbackHistory.length - 1; i++) {
    const a = fallbackHistory[i];
    const b = fallbackHistory[i + 1];
    if (a.role === "user" && b.role === "assistant") {
      pairs.push({
        user: a.content,
        assistant: b.content,
        createdAt: b.createdAt || a.createdAt,
      });
      i++;
    }
  }
  const turns = pairs.slice(-n);
  return { turns, source: turns.length ? "store" : "none" };
}

export function formatChatMemoryContext(turns: MemoryTurn[]): string {
  if (!turns.length) return "";
  const lines = [
    `Recent conversation (last ${turns.length} turn${turns.length === 1 ? "" : "s"}):`,
  ];
  for (const t of turns) {
    lines.push(`User: ${clip(t.user, 800)}`);
    lines.push(`Assistant: ${clip(t.assistant, 1200)}`);
  }
  return lines.join("\n");
}
