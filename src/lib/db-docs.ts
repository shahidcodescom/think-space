import { query } from "./db";

export async function getDoc<T>(key: string): Promise<T | null> {
  const res = await query<{ data: T }>(
    "SELECT data FROM app_documents WHERE key = $1",
    [key]
  );
  if (!res.rowCount) return null;
  return res.rows[0].data;
}

export async function setDoc<T>(key: string, data: T): Promise<void> {
  await query(
    `INSERT INTO app_documents (key, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET
       data = EXCLUDED.data,
       updated_at = NOW()`,
    [key, JSON.stringify(data)]
  );
}

export async function getOrInitDoc<T>(
  key: string,
  init: () => T | Promise<T>
): Promise<T> {
  const existing = await getDoc<T>(key);
  if (existing !== null) return existing;
  const created = await init();
  await setDoc(key, created);
  return created;
}
