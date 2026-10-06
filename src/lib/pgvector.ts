import { Pool } from "pg";
import { EMBEDDING_DIM, embedQuery, embedTexts } from "./embeddings";
import {
  getDecryptedPgPassword,
  readLlmSettings,
} from "./llm-store";
import { collectWorkspaceChunks } from "./rag";
import type { AiExtras } from "./ai";
import type { LlmSettingsStored, StoreData } from "./types";
import { RagChunk } from "./rag";

let pool: Pool | null = null;
let poolKey = "";

export function buildPgConfig(settings: LlmSettingsStored, password: string | null) {
  const envUrl = process.env.DATABASE_URL?.trim();
  if (settings.pgConnectionString.trim()) {
    return { connectionString: settings.pgConnectionString.trim() };
  }
  if (envUrl && settings.pgEnabled) {
    return { connectionString: envUrl };
  }
  return {
    host: settings.pgHost || process.env.DATABASE_HOST || "127.0.0.1",
    port: settings.pgPort || Number(process.env.DATABASE_PORT) || 5432,
    database: settings.pgDatabase || process.env.DATABASE_NAME || "bipolar",
    user: settings.pgUser || process.env.DATABASE_USER || "postgres",
    password: password || process.env.DATABASE_PASSWORD || undefined,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

async function getPool(): Promise<Pool | null> {
  const settings = await readLlmSettings();
  if (!settings.pgEnabled) return null;
  const password = await getDecryptedPgPassword(settings);
  const cfg = buildPgConfig(settings, password);
  const key = JSON.stringify(cfg);
  if (pool && poolKey === key) return pool;
  if (pool) {
    await pool.end().catch(() => undefined);
    pool = null;
  }
  pool = new Pool({ ...cfg, max: 4, idleTimeoutMillis: 10_000 });
  poolKey = key;
  return pool;
}

export async function testPgConnection(): Promise<{
  ok: boolean;
  message: string;
  vectorReady?: boolean;
}> {
  const settings = await readLlmSettings();
  if (!settings.pgEnabled && !process.env.DATABASE_URL) {
    return { ok: false, message: "Postgres RAG is disabled and DATABASE_URL is unset." };
  }
  try {
    const p = await getPool();
    if (!p) return { ok: false, message: "Could not create pool (enable pg in settings)." };
    const client = await p.connect();
    try {
      await client.query("SELECT 1");
      let vectorReady = false;
      try {
        await client.query("CREATE EXTENSION IF NOT EXISTS vector");
        const r = await client.query(
          "SELECT extname FROM pg_extension WHERE extname = 'vector'"
        );
        vectorReady = r.rowCount !== null && r.rowCount > 0;
      } catch (err) {
        return {
          ok: true,
          message: `Connected, but pgvector extension unavailable: ${
            err instanceof Error ? err.message : "error"
          }`,
          vectorReady: false,
        };
      }
      return {
        ok: true,
        message: vectorReady
          ? "Connected — pgvector ready."
          : "Connected — enable the vector extension for embeddings.",
        vectorReady,
      };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed",
    };
  }
}

const MIGRATION_SQL = `
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS rag_embeddings (
  id TEXT PRIMARY KEY,
  module TEXT NOT NULL,
  source_id TEXT,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL DEFAULT '',
  embedding vector(${EMBEDDING_DIM}),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS rag_embeddings_module_idx ON rag_embeddings (module);
`;

export async function migratePgVector(): Promise<{ ok: boolean; message: string }> {
  try {
    const p = await getPool();
    if (!p) return { ok: false, message: "Postgres not enabled" };
    const client = await p.connect();
    try {
      await client.query(MIGRATION_SQL);
      // IVFFlat / HNSW optional — skip if not supported
      try {
        await client.query(`
          CREATE INDEX IF NOT EXISTS rag_embeddings_embedding_idx
          ON rag_embeddings USING hnsw (embedding vector_cosine_ops);
        `);
      } catch {
        try {
          await client.query(`
            CREATE INDEX IF NOT EXISTS rag_embeddings_embedding_idx
            ON rag_embeddings USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100);
          `);
        } catch {
          /* sequential scan fine for small corpora */
        }
      }
      return { ok: true, message: "Schema migrated (rag_embeddings + vector)." };
    } finally {
      client.release();
    }
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Migration failed",
    };
  }
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(",")}]`;
}

export async function reindexWorkspace(
  store: StoreData,
  extras: AiExtras,
  modules?: string[]
): Promise<{ ok: boolean; message: string; count?: number; provider?: string }> {
  const migrated = await migratePgVector();
  if (!migrated.ok) return migrated;
  const p = await getPool();
  if (!p) return { ok: false, message: "No pool" };

  const chunks = collectWorkspaceChunks(store, extras, modules);
  if (!chunks.length) {
    return { ok: true, message: "Nothing to index", count: 0 };
  }

  const texts = chunks.map((c) => `${c.title}. ${c.text}`);
  const { vectors, provider } = await embedTexts(texts);
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM rag_embeddings");
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const id = `${c.module}:${c.id || i}`;
      await client.query(
        `INSERT INTO rag_embeddings (id, module, source_id, title, content, embedding, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::vector, NOW())
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           embedding = EXCLUDED.embedding,
           updated_at = NOW()`,
        [
          id,
          c.module,
          c.id || null,
          c.title,
          c.text,
          toVectorLiteral(vectors[i]),
        ]
      );
    }
    await client.query("COMMIT");
    return {
      ok: true,
      message: `Indexed ${chunks.length} chunks (${provider} embeddings).`,
      count: chunks.length,
      provider,
    };
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Reindex failed",
    };
  } finally {
    client.release();
  }
}

export async function searchPgVector(
  query: string,
  opts: { topK: number; modules?: string[] }
): Promise<RagChunk[] | null> {
  const settings = await readLlmSettings();
  if (!settings.pgEnabled) return null;
  try {
    const p = await getPool();
    if (!p) return null;
    const qVec = await embedQuery(query);
    const modules = opts.modules?.length ? opts.modules : null;
    const client = await p.connect();
    try {
      const res = modules
        ? await client.query(
            `SELECT module, source_id, title, content,
                    1 - (embedding <=> $1::vector) AS score
             FROM rag_embeddings
             WHERE module = ANY($2::text[])
             ORDER BY embedding <=> $1::vector
             LIMIT $3`,
            [toVectorLiteral(qVec), modules, opts.topK]
          )
        : await client.query(
            `SELECT module, source_id, title, content,
                    1 - (embedding <=> $1::vector) AS score
             FROM rag_embeddings
             ORDER BY embedding <=> $1::vector
             LIMIT $2`,
            [toVectorLiteral(qVec), opts.topK]
          );
      return res.rows.map((r) => ({
        module: r.module as string,
        id: (r.source_id as string) || undefined,
        title: r.title as string,
        text: r.content as string,
        score: Number(r.score) || 0,
      }));
    } finally {
      client.release();
    }
  } catch {
    return null; // fall back to JSON RAG
  }
}

export async function resetPgPool() {
  if (pool) {
    await pool.end().catch(() => undefined);
    pool = null;
    poolKey = "";
  }
}
