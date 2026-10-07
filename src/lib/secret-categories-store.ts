import { promises as fs } from "fs";
import path from "path";
import { SecretCategory } from "./types";
import { nowIso, uid } from "./store";

const DATA_PATH = path.join(process.cwd(), "data", "secret-categories.json");

export const DEFAULT_SECRET_CATEGORIES = [
  "API Keys",
  "Passwords",
  "Tokens",
  "Certificates",
  "Database",
  "Other",
] as const;

export type SecretCategoriesFile = { categories: SecretCategory[] };

export function seedCategories(): SecretCategory[] {
  const ts = nowIso();
  return DEFAULT_SECRET_CATEGORIES.map((name) => ({
    id: uid("sec-cat"),
    name,
    createdAt: ts,
    updatedAt: ts,
  }));
}

/** Replace categories with the built-in default list. */
export async function reseedSecretCategories(): Promise<SecretCategoriesFile> {
  const seeded: SecretCategoriesFile = { categories: seedCategories() };
  await writeSecretCategoriesFile(seeded);
  return seeded;
}

export async function readSecretCategoriesFile(): Promise<SecretCategoriesFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SecretCategoriesFile;
    const categories = Array.isArray(parsed.categories) ? parsed.categories : [];
    if (categories.length === 0) {
      const seeded: SecretCategoriesFile = { categories: seedCategories() };
      await writeSecretCategoriesFile(seeded);
      return seeded;
    }
    return { categories };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const seeded: SecretCategoriesFile = { categories: seedCategories() };
      await writeSecretCategoriesFile(seeded);
      return seeded;
    }
    throw err;
  }
}

export async function writeSecretCategoriesFile(
  data: SecretCategoriesFile
): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
