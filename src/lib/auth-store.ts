import { promises as fs } from "fs";
import path from "path";
import type { AuthFile, AuthUserPublic, AuthUserRecord } from "./auth-types";

const DATA_PATH = path.join(process.cwd(), "data", "auth.json");

const empty: AuthFile = { user: null };

export async function readAuthFile(): Promise<AuthFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as AuthFile;
    return { user: parsed?.user ?? null };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      await writeAuthFile(empty);
      return { ...empty };
    }
    throw err;
  }
}

export async function writeAuthFile(data: AuthFile): Promise<void> {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
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
