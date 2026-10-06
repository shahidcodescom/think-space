import { createCipheriv, createDecipheriv, randomBytes, createHash, scryptSync } from "crypto";
import { promises as fs } from "fs";
import path from "path";

const KEY_FILE = path.join(process.cwd(), "data", ".secrets-master-key");
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

export type KeySource = "env" | "local-file" | "generated";

let cachedKey: Buffer | null = null;
let cachedSource: KeySource | null = null;

function deriveKey(material: string): Buffer {
  // Accept raw 64-hex (32 bytes) or any passphrase via scrypt
  const hex = material.trim();
  if (/^[0-9a-fA-F]{64}$/.test(hex)) {
    return Buffer.from(hex, "hex");
  }
  return scryptSync(hex, "second-brain-secrets-v1", 32);
}

async function ensureLocalKeyFile(): Promise<{ key: Buffer; source: KeySource }> {
  try {
    const existing = await fs.readFile(KEY_FILE, "utf-8");
    const trimmed = existing.trim();
    if (trimmed) {
      return { key: deriveKey(trimmed), source: "local-file" };
    }
  } catch {
    // missing — generate
  }
  const generated = randomBytes(32).toString("hex");
  await fs.mkdir(path.dirname(KEY_FILE), { recursive: true });
  await fs.writeFile(KEY_FILE, generated + "\n", { mode: 0o600 });
  return { key: deriveKey(generated), source: "generated" };
}

export async function getMasterKey(): Promise<{ key: Buffer; source: KeySource }> {
  if (cachedKey && cachedSource) {
    return { key: cachedKey, source: cachedSource };
  }
  const fromEnv = process.env.SECRETS_MASTER_KEY?.trim();
  if (fromEnv) {
    cachedKey = deriveKey(fromEnv);
    cachedSource = "env";
    return { key: cachedKey, source: cachedSource };
  }
  const local = await ensureLocalKeyFile();
  cachedKey = local.key;
  cachedSource = local.source;
  return local;
}

export async function getVaultStatus(): Promise<{
  configured: boolean;
  source: KeySource;
  hint: string;
}> {
  const { source } = await getMasterKey();
  const hints: Record<KeySource, string> = {
    env: "Using SECRETS_MASTER_KEY from environment.",
    "local-file": "Using gitignored key file at data/.secrets-master-key.",
    generated:
      "Generated a new local key at data/.secrets-master-key (gitignored). Set SECRETS_MASTER_KEY for production.",
  };
  return { configured: true, source, hint: hints[source] };
}

/** Encrypt plaintext → base64 payload: iv.tag.ciphertext */
export async function encryptSecret(plaintext: string): Promise<string> {
  const { key } = await getMasterKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

/** Decrypt base64 payload from encryptSecret */
export async function decryptSecret(payload: string): Promise<string> {
  const { key } = await getMasterKey();
  const parts = payload.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid ciphertext format");
  }
  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");
  if (iv.length !== IV_LEN || tag.length !== TAG_LEN) {
    throw new Error("Invalid ciphertext length");
  }
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Non-reversible fingerprint for change detection (never log the value). */
export function valueFingerprint(plaintext: string): string {
  return createHash("sha256").update(plaintext, "utf8").digest("hex").slice(0, 12);
}

/** Masked preview like sk_l••••••••abc (no full value). */
export function maskPreview(plaintext: string): string {
  if (!plaintext) return "••••";
  if (plaintext.length <= 4) return "•".repeat(plaintext.length);
  if (plaintext.length <= 8) {
    return plaintext.slice(0, 1) + "•".repeat(plaintext.length - 2) + plaintext.slice(-1);
  }
  return plaintext.slice(0, 3) + "•".repeat(Math.min(10, plaintext.length - 6)) + plaintext.slice(-3);
}
