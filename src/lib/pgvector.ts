import { embedQuery, embedTexts } from "./embeddings";
import { collectWorkspaceChunks } from "./rag";
import type { AiExtras } from "./ai";
import type { StoreData } from "./types";
import { RagChunk } from "./rag";
import {
  DatabaseConfigError,
  ensureDatabase,
  getPool,
  requireDatabaseUrl,
  resetPool,
} from "./db";

export { resetPool as resetPgPool };

export async function testPgConnection(): Promise<{
  ok: boolean;
  message: string;
  vectorReady?: boolean;
}> {
  try {
    requireDatabaseUrl();
    await ensureDatabase();
    const p = getPool();
    const client = await p.connect();
    try {
      await client.query("SELECT 1");
      const r = await client.query(
        "SELECT extname FROM pg_extension WHERE extname = 'vector'"
      );
      const vectorReady = (r.rowCount ?? 0) > 0;
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
      message:
        err instanceof DatabaseConfigError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Connection failed",
    };
  }
}

/** Schema is migrated on boot via ensureDatabase — kept for scripts/API. */
export async function migratePgVector(): Promise<{
  ok: boolean;
  message: string;
}> {
  try {
    await ensureDatabase();
    return {
      ok: true,
      message: "Schema ready (app_documents + rag_embeddings + vector).",
    };
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
  const p = getPool();

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
  try {
    await ensureDatabase();
    const p = getPool();
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
    return null; // fall back to in-memory keyword RAG
  }
}
