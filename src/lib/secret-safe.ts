import { SecretPublic, SecretRecord } from "./types";

/** Allowlisted secret fields safe for Thinking space / RAG / LLM context. */
export type SecretContextMeta = {
  id: string;
  name: string;
  category: string;
  updatedAt: string;
  hasValue: boolean;
};

type SecretLike = Pick<
  SecretPublic | SecretRecord,
  "id" | "name" | "category" | "updatedAt"
> & { hasValue?: boolean; valueCiphertext?: string };

/** Strip ciphertext, notes, tags, fingerprints — metadata only. */
export function toSecretContextMeta(s: SecretLike): SecretContextMeta {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    updatedAt: s.updatedAt,
    hasValue:
      typeof s.hasValue === "boolean"
        ? s.hasValue
        : Boolean(s.valueCiphertext),
  };
}

export function formatSecretMetaLine(
  s: SecretContextMeta,
  openMarkdown: string
): string {
  const when = s.updatedAt ? ` · updated ${s.updatedAt.slice(0, 10)}` : "";
  const valued = s.hasValue ? "" : " · empty";
  return `**${s.name}** (${s.category})${when}${valued} — ${openMarkdown}`;
}

/** Compact one-liner for LLM system context (no notes/tags/values). */
export function formatSecretMetaCompact(s: SecretContextMeta): string {
  return `${s.name} [${s.category}] id=${s.id}`;
}

/** Reject strings that look like ciphertext payloads or raw key material. */
export function looksLikeSecretMaterial(text: string): boolean {
  if (!text) return false;
  // AES payload shape used by crypto.ts: iv.tag.ciphertext (base64 segments)
  if (/[A-Za-z0-9+/=]{8,}\.[A-Za-z0-9+/=]{8,}\.[A-Za-z0-9+/=]{8,}/.test(text)) {
    return true;
  }
  if (/\bsk-[A-Za-z0-9]{10,}\b/.test(text)) return true;
  if (/\bAIza[A-Za-z0-9_-]{20,}\b/.test(text)) return true;
  if (/\bBearer\s+[A-Za-z0-9._\-]+\b/i.test(text)) return true;
  if (/\bvalueCiphertext\b/i.test(text)) return true;
  return false;
}
