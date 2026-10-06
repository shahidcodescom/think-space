import { promises as fs } from "fs";
import path from "path";
import { SecretRecord } from "./types";

const SECRETS_PATH = path.join(process.cwd(), "data", "secrets.json");

export type SecretsFile = {
  secrets: SecretRecord[];
};

export async function readSecretsFile(): Promise<SecretsFile> {
  try {
    const raw = await fs.readFile(SECRETS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SecretsFile;
    return { secrets: Array.isArray(parsed.secrets) ? parsed.secrets : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: SecretsFile = { secrets: [] };
      await writeSecretsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeSecretsFile(data: SecretsFile): Promise<void> {
  await fs.writeFile(SECRETS_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
