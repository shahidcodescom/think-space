import { NextRequest, NextResponse } from "next/server";
import {
  readLlmSettings,
  toPublicSettings,
  updateLlmSettings,
} from "@/lib/llm-store";
import { LlmProvider } from "@/lib/types";

export async function GET() {
  const settings = await readLlmSettings();
  const pub = await toPublicSettings(settings);
  return NextResponse.json(pub);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const providers: LlmProvider[] = [
    "openai",
    "gemini",
    "claude",
    "openrouter",
    "ollama",
  ];

  const patch: Parameters<typeof updateLlmSettings>[0] = {};
  if (body.enabled !== undefined) patch.enabled = Boolean(body.enabled);
  if (typeof body.provider === "string" && providers.includes(body.provider)) {
    patch.provider = body.provider;
  }
  if (typeof body.model === "string") patch.model = body.model;
  if (typeof body.baseUrl === "string") patch.baseUrl = body.baseUrl;
  if (body.clearApiKey === true) patch.clearApiKey = true;
  else if (typeof body.apiKey === "string") patch.apiKey = body.apiKey;

  const updated = await updateLlmSettings(patch);
  const pub = await toPublicSettings(updated);
  // Never return ciphertext or plaintext key
  return NextResponse.json(pub);
}
