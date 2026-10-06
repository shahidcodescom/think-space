import { NextRequest, NextResponse } from "next/server";
import { LLM_PROVIDERS } from "@/lib/llm-defaults";
import { listProviderModels } from "@/lib/llm-models";
import { LlmProvider } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const providerParam = searchParams.get("provider")?.trim().toLowerCase();
  const baseUrl = searchParams.get("baseUrl") ?? undefined;
  const provider =
    providerParam && (LLM_PROVIDERS as string[]).includes(providerParam)
      ? (providerParam as LlmProvider)
      : undefined;

  const result = await listProviderModels({
    provider,
    baseUrl: baseUrl === null ? undefined : baseUrl,
  });

  return NextResponse.json(result);
}
