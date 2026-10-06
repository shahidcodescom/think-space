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
  if (body.temperature !== undefined) patch.temperature = Number(body.temperature);
  if (body.maxTokens !== undefined) patch.maxTokens = Number(body.maxTokens);
  if (typeof body.systemPrompt === "string") patch.systemPrompt = body.systemPrompt;
  if (body.ragEnabled !== undefined) patch.ragEnabled = Boolean(body.ragEnabled);
  if (body.ragTopK !== undefined) patch.ragTopK = Number(body.ragTopK);
  if (body.ragChunkSize !== undefined) patch.ragChunkSize = Number(body.ragChunkSize);
  if (body.contextCharLimit !== undefined)
    patch.contextCharLimit = Number(body.contextCharLimit);
  if (Array.isArray(body.ragModules)) patch.ragModules = body.ragModules.map(String);
  if (body.pgEnabled !== undefined) patch.pgEnabled = Boolean(body.pgEnabled);
  if (typeof body.pgConnectionString === "string")
    patch.pgConnectionString = body.pgConnectionString;
  if (typeof body.pgHost === "string") patch.pgHost = body.pgHost;
  if (body.pgPort !== undefined) patch.pgPort = Number(body.pgPort);
  if (typeof body.pgDatabase === "string") patch.pgDatabase = body.pgDatabase;
  if (typeof body.pgUser === "string") patch.pgUser = body.pgUser;
  if (body.clearPgPassword === true) patch.clearPgPassword = true;
  else if (typeof body.pgPassword === "string") patch.pgPassword = body.pgPassword;

  const updated = await updateLlmSettings(patch);
  const pub = await toPublicSettings(updated);
  return NextResponse.json(pub);
}
