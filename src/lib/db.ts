import { Pool, type PoolClient, type QueryResultRow } from "pg";

/** Keep in sync with embeddings.EMBEDDING_DIM — avoid import cycle. */
const EMBEDDING_DIM = 384;

export class DatabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DatabaseConfigError";
  }
}

let pool: Pool | null = null;
let migrated = false;
let migratePromise: Promise<void> | null = null;

/** Require DATABASE_URL (or discrete DATABASE_* vars that compose a URL). */
export function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL?.trim();
  if (url) return url;

  const host = process.env.DATABASE_HOST?.trim();
  const user = process.env.DATABASE_USER?.trim();
  const password = process.env.DATABASE_PASSWORD ?? "";
  const database = process.env.DATABASE_NAME?.trim();
  const port = process.env.DATABASE_PORT?.trim() || "5432";
  if (host && user && database) {
    const auth = password
      ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
      : encodeURIComponent(user);
    return `postgresql://${auth}@${host}:${port}/${database}`;
  }

  throw new DatabaseConfigError(
    "DATABASE_URL is required. Set DATABASE_URL (or DATABASE_HOST, DATABASE_USER, DATABASE_NAME[, DATABASE_PASSWORD]) before starting Bi-Polar. App data is Postgres-only."
  );
}

export function getPool(): Pool {
  if (pool) return pool;
  const connectionString = requireDatabaseUrl();
  const ssl =
    process.env.DATABASE_SSL === "true" || process.env.DATABASE_SSL === "1"
      ? { rejectUnauthorized: false }
      : undefined;
  pool = new Pool({
    connectionString,
    ssl,
    max: 8,
    idleTimeoutMillis: 20_000,
  });
  pool.on("error", (err) => {
    console.error("[db] idle client error", err.message);
  });
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
) {
  await ensureDatabase();
  return getPool().query<T>(text, params);
}

export async function withClient<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  await ensureDatabase();
  const client = await getPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS app_documents (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

async function runMigrations(): Promise<void> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query(SCHEMA_SQL);
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
        /* small corpora: sequential scan is fine */
      }
    }
  } finally {
    client.release();
  }
}

/** Idempotent schema migrate — safe to call on every request / boot. */
export async function ensureDatabase(): Promise<void> {
  if (migrated) return;
  if (!migratePromise) {
    migratePromise = runMigrations()
      .then(() => {
        migrated = true;
      })
      .catch((err) => {
        migratePromise = null;
        throw err;
      });
  }
  await migratePromise;
}

export async function resetPool(): Promise<void> {
  if (pool) {
    await pool.end().catch(() => undefined);
    pool = null;
  }
  migrated = false;
  migratePromise = null;
}

/** Clear all app documents + RAG embeddings (system reset). */
export async function wipeAppData(): Promise<void> {
  await ensureDatabase();
  await getPool().query("DELETE FROM app_documents");
  await getPool().query("DELETE FROM rag_embeddings");
}
