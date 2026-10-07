import { SecretCategory } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";
import { nowIso, uid } from "./store";

const KEY = "secret-categories";

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

export async function reseedSecretCategories(): Promise<SecretCategoriesFile> {
  const seeded: SecretCategoriesFile = { categories: seedCategories() };
  await writeSecretCategoriesFile(seeded);
  return seeded;
}

export async function readSecretCategoriesFile(): Promise<SecretCategoriesFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<SecretCategoriesFile>(
      "secret-categories.json"
    );
    const categories = Array.isArray(legacy?.categories) ? legacy!.categories : [];
    if (categories.length === 0) {
      return { categories: seedCategories() };
    }
    return { categories };
  });
}

export async function writeSecretCategoriesFile(
  data: SecretCategoriesFile
): Promise<void> {
  await setDoc(KEY, data);
}
