import type { AuthFile, AuthUserPublic, AuthUserRecord } from "./auth-types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "auth";
export async function readAuthFile(): Promise<AuthFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<AuthFile>("auth.json");
    return { user: legacy?.user ?? null };
  });
}

export async function writeAuthFile(data: AuthFile): Promise<void> {
  await setDoc(KEY, data);
}

export function toPublicUser(u: AuthUserRecord): AuthUserPublic {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export async function accountExists(): Promise<boolean> {
  const file = await readAuthFile();
  return Boolean(file.user?.passwordHash);
}

export async function getUserRecord(): Promise<AuthUserRecord | null> {
  const file = await readAuthFile();
  return file.user;
}
