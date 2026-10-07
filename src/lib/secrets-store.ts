import { SecretRecord } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "secrets";

export type SecretsFile = { secrets: SecretRecord[] };

export async function readSecretsFile(): Promise<SecretsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<SecretsFile>("secrets.json");
    return { secrets: Array.isArray(legacy?.secrets) ? legacy!.secrets : [] };
  });
}

export async function writeSecretsFile(data: SecretsFile): Promise<void> {
  await setDoc(KEY, data);
}
