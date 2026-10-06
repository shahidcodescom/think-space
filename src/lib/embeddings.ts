import { createHash } from "crypto";
import { getDecryptedApiKey, readLlmSettings } from "./llm-store";

export const EMBEDDING_DIM = 384;

/** Deterministic local embedding (no API) — bag-of-hashing for offline/fallback. */
export function localEmbed(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = new Array(dim).fill(0);
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/i)
    .filter((t) => t.length > 1);
  if (!tokens.length) tokens.push("empty");
  for (const tok of tokens) {
    const h = createHash("sha256").update(tok).digest();
    for (let i = 0; i < dim; i++) {
      const byte = h[i % h.length];
      vec[i] += (byte / 255) * 2 - 1;
    }
  }
  // L2 normalize
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

async function openaiEmbed(texts: string[], apiKey: string): Promise<number[][]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
      dimensions: EMBEDDING_DIM,
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI embeddings HTTP ${res.status}: ${err.slice(0, 160)}`);
  }
  const data = (await res.json()) as {
    data: { embedding: number[]; index: number }[];
  };
  return data.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}

/** Embed texts — prefers OpenAI when key available, else local. */
export async function embedTexts(texts: string[]): Promise<{
  vectors: number[][];
  provider: "openai" | "local";
}> {
  if (!texts.length) return { vectors: [], provider: "local" };
  const settings = await readLlmSettings();
  const key =
    (await getDecryptedApiKey({ ...settings, provider: "openai" })) ||
    process.env.OPENAI_API_KEY?.trim() ||
    null;
  if (key) {
    try {
      const vectors = await openaiEmbed(texts, key);
      return { vectors, provider: "openai" };
    } catch {
      /* fall through to local */
    }
  }
  return {
    vectors: texts.map((t) => localEmbed(t)),
    provider: "local",
  };
}

export async function embedQuery(text: string): Promise<number[]> {
  const { vectors } = await embedTexts([text]);
  return vectors[0] || localEmbed(text);
}
