import { NextRequest, NextResponse } from "next/server";
import {
  deleteIntent,
  listIntents,
  setIntentEnabled,
  upsertIntent,
  INTENT_ACTIONS,
} from "@/lib/intents";
import { IntentAction } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const intents = await listIntents();
  return NextResponse.json({ intents, actions: INTENT_ACTIONS });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  if (body.id && typeof body.enabled === "boolean" && body.toggleOnly) {
    const updated = await setIntentEnabled(body.id, body.enabled);
    if (!updated)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(updated);
  }
  const name = String(body.name || "").trim();
  const action = body.action as IntentAction;
  const patterns = Array.isArray(body.patterns)
    ? body.patterns.map(String)
    : String(body.pattern || "")
        .split("\n")
        .map((s: string) => s.trim())
        .filter(Boolean);
  if (!name || !action || !patterns.length) {
    return NextResponse.json(
      { error: "name, action, and patterns required" },
      { status: 400 }
    );
  }
  if (!INTENT_ACTIONS.some((a) => a.value === action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  const saved = await upsertIntent({
    id: typeof body.id === "string" ? body.id : undefined,
    name,
    action,
    patterns,
    enabled: body.enabled !== false,
  });
  return NextResponse.json(saved);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id)
    return NextResponse.json({ error: "id required" }, { status: 400 });
  const ok = await deleteIntent(id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
