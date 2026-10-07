import assert from "node:assert/strict";
import {
  formatChatMemoryContext,
  loadRecentChatMemory,
  type MemoryTurn,
} from "./chat-memory";
import type { ChatMessage } from "./types";

async function main() {
  const turns: MemoryTurn[] = [
    { user: "List notes", assistant: "You have 2 notes", createdAt: "2026-01-01T00:00:00.000Z" },
    { user: "And tasks?", assistant: "3 open tasks", createdAt: "2026-01-01T00:01:00.000Z" },
  ];
  const formatted = formatChatMemoryContext(turns);
  assert.match(formatted, /last 2 turns/);
  assert.match(formatted, /List notes/);
  assert.match(formatted, /3 open tasks/);
  assert.equal(formatChatMemoryContext([]), "");

  const history: ChatMessage[] = [
    { id: "1", role: "user", content: "Hi", createdAt: "t1" },
    { id: "2", role: "assistant", content: "Hello", createdAt: "t2" },
    { id: "3", role: "user", content: "Bye", createdAt: "t3" },
    { id: "4", role: "assistant", content: "Later", createdAt: "t4" },
  ];

  // Without REDIS_URL, load falls back to store history
  const prev = process.env.REDIS_URL;
  delete process.env.REDIS_URL;
  const loaded = await loadRecentChatMemory(1, history);
  assert.equal(loaded.source, "store");
  assert.equal(loaded.turns.length, 1);
  assert.equal(loaded.turns[0].user, "Bye");
  assert.equal(loaded.turns[0].assistant, "Later");

  const none = await loadRecentChatMemory(0, history);
  assert.equal(none.source, "none");
  assert.equal(none.turns.length, 0);

  if (prev === undefined) delete process.env.REDIS_URL;
  else process.env.REDIS_URL = prev;

  console.log("chat-memory.test.ts: ok");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
