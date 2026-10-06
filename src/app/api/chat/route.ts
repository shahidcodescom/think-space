import { NextRequest, NextResponse } from "next/server";
import { answerQuery, renderAnswerMarkdown } from "@/lib/ai";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";

export async function GET() {
  const store = await readStore();
  return NextResponse.json(store.chatHistory);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const message = String(body.message || "").trim();
  if (!message) {
    return NextResponse.json({ error: "Empty message" }, { status: 400 });
  }

  const store = await readStore();
  const userMsg = {
    id: uid("msg"),
    role: "user" as const,
    content: message,
    createdAt: nowIso(),
  };

  const answer = answerQuery(message, store);
  const html = renderAnswerMarkdown(answer.title, answer.text);
  const assistantMsg = {
    id: uid("msg"),
    role: "assistant" as const,
    content: answer.title ? `${answer.title}\n${answer.text}` : answer.text,
    html,
    createdAt: nowIso(),
  };

  store.chatHistory.push(userMsg, assistantMsg);
  // keep last 40 messages
  if (store.chatHistory.length > 40) {
    store.chatHistory = store.chatHistory.slice(-40);
  }
  await writeStore(store);

  return NextResponse.json({ user: userMsg, assistant: assistantMsg });
}

export async function DELETE() {
  const store = await readStore();
  store.chatHistory = [];
  await writeStore(store);
  return NextResponse.json({ ok: true });
}
