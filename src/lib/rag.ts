import { AiExtras } from "./ai";
import { toSecretContextMeta } from "./secret-safe";
import { stripHtml } from "./sanitize";
import { StoreData } from "./types";

import { RAG_MODULE_IDS } from "./rag-modules";

export { RAG_MODULE_IDS } from "./rag-modules";
export type { RagModuleId } from "./rag-modules";

export type RagChunk = {
  module: string;
  id?: string;
  title: string;
  text: string;
  score: number;
};

function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 2);
}

function scoreText(hay: string, tokens: string[]): number {
  if (!tokens.length) return 0;
  const h = hay.toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (h.includes(t)) score += 1;
  }
  if (score) score += Math.min(2, score / tokens.length);
  return score;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? t.slice(0, n - 1) + "…" : t;
}

export function collectWorkspaceChunks(
  store: StoreData,
  extras: AiExtras = {},
  modules?: string[]
): Omit<RagChunk, "score">[] {
  const allow = new Set(
    modules?.length ? modules : (RAG_MODULE_IDS as readonly string[])
  );
  const chunks: Omit<RagChunk, "score">[] = [];
  const push = (c: Omit<RagChunk, "score">) => {
    if (allow.has(c.module)) chunks.push(c);
  };

  for (const n of store.notes) {
    push({
      module: "notes",
      id: n.id,
      title: n.title,
      text: `${n.title}. ${stripHtml(n.content)}`,
    });
  }
  for (const t of store.tasks) {
    push({
      module: "tasks",
      id: t.id,
      title: t.title,
      text: `${t.title} (${t.done ? "done" : "open"})`,
    });
  }
  for (const m of store.meetings) {
    push({
      module: "meetings",
      id: m.id,
      title: m.title,
      text: `${m.title}. ${m.agenda} ${m.minutes} ${m.decisions}`,
    });
  }
  for (const th of store.thoughts) {
    push({
      module: "thoughts",
      id: th.id,
      title: th.title,
      text: `${th.title}. ${th.content}`,
    });
  }
  for (const m of store.memories) {
    push({
      module: "memories",
      id: m.id,
      title: m.title,
      text: `${m.title}. ${m.content}`,
    });
  }
  for (const s of extras.secrets || []) {
    const meta = toSecretContextMeta(s);
    push({
      module: "secrets",
      id: meta.id,
      title: meta.name,
      // Metadata only — never notes, tags, values, or ciphertext
      text: `${meta.name} [${meta.category}] id=${meta.id} updated=${meta.updatedAt.slice(0, 10)} (value not included — open Secrets)`,
    });
  }
  for (const a of extras.assets || []) {
    push({
      module: "assets",
      id: a.id,
      title: a.name,
      text: `${a.name} ${a.type} ${a.status} ${a.location || ""}`,
    });
  }
  for (const p of extras.projects || []) {
    push({
      module: "projects",
      id: p.id,
      title: p.name,
      text: `${p.name} ${p.status} ${p.description || ""}`,
    });
  }
  for (const c of extras.clients || []) {
    push({
      module: "clients",
      id: c.id,
      title: c.name,
      text: `${c.name}`,
    });
  }
  for (const r of extras.recurrings || []) {
    push({
      module: "recurrings",
      id: r.id,
      title: r.name,
      text: `${r.name} ${r.category} due ${r.nextDueDate || "—"}`,
    });
  }
  for (const f of extras.finance || []) {
    push({
      module: "finance",
      id: f.id,
      title: f.category || f.type,
      text: `${f.type} ${f.amount} ${f.currency} ${f.category} ${f.counterparty || ""}`,
    });
  }
  for (const b of extras.belongings || []) {
    push({
      module: "belongings",
      id: b.id,
      title: b.name,
      text: `${b.name} @ ${b.location || "?"} (${b.status})`,
    });
  }
  for (const e of extras.calendarEvents || []) {
    push({
      module: "calendar",
      id: e.id,
      title: e.title,
      text: `${e.title} ${e.start} ${e.type}`,
    });
  }
  for (const j of extras.jobs || []) {
    push({
      module: "jobs",
      id: j.id,
      title: `${j.company} — ${j.role}`,
      text: `${j.company} ${j.role} [${j.status}]`,
    });
  }
  for (const s of extras.skills || []) {
    push({
      module: "skills",
      id: s.id,
      title: s.name,
      text: `${s.name} (${s.status}) ${s.category || ""}`,
    });
  }
  for (const i of extras.library || []) {
    push({
      module: "library",
      id: i.id,
      title: i.title,
      text: `${i.title} (${i.type}) ${(i.tags || []).join(" ")}`,
    });
  }
  return chunks;
}

export function retrieveRagChunks(
  query: string,
  store: StoreData,
  extras: AiExtras,
  opts: { topK: number; chunkSize: number; modules?: string[] }
): RagChunk[] {
  const tokens = tokenize(query);
  return collectWorkspaceChunks(store, extras, opts.modules)
    .map((c) => ({
      ...c,
      text: clip(c.text, opts.chunkSize),
      score: scoreText(`${c.title} ${c.text}`, tokens),
    }))
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, opts.topK));
}

export function formatRagContext(chunks: RagChunk[]): string {
  if (!chunks.length) return "";
  const lines = ["Retrieved workspace snippets (most relevant first):"];
  for (const c of chunks) {
    const idBit = c.id ? ` id=${c.id}` : "";
    lines.push(`[${c.module}${idBit}] ${c.title}: ${c.text}`);
  }
  return lines.join("\n");
}


/** RAG for Thinking space: pgvector when enabled, else in-memory keyword chunks. */
export async function buildThinkingRagContext(
  query: string,
  store: StoreData,
  extras: AiExtras,
  config: {
    ragEnabled: boolean;
    ragTopK: number;
    ragChunkSize: number;
    ragModules: string[];
    contextCharLimit: number;
  }
): Promise<{ context: string; source: "pgvector" | "memory" | "off" }> {
  if (!config.ragEnabled) {
    return { context: "", source: "off" };
  }
  try {
    const { searchPgVector } = await import("./pgvector");
    const pgChunks = await searchPgVector(query, {
      topK: config.ragTopK,
      modules: config.ragModules,
    });
    if (pgChunks && pgChunks.length) {
      let ctx = formatRagContext(pgChunks);
      if (ctx.length > config.contextCharLimit) {
        ctx = ctx.slice(0, config.contextCharLimit) + "\n…";
      }
      return { context: ctx, source: "pgvector" };
    }
  } catch {
    /* fall through */
  }
  const chunks = retrieveRagChunks(query, store, extras, {
    topK: config.ragTopK,
    chunkSize: config.ragChunkSize,
    modules: config.ragModules,
  });
  let ctx = formatRagContext(chunks);
  if (ctx.length > config.contextCharLimit) {
    ctx = ctx.slice(0, config.contextCharLimit) + "\n…";
  }
  return { context: ctx, source: chunks.length ? "memory" : "off" };
}
