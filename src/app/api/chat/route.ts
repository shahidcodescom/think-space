import { NextRequest, NextResponse } from "next/server";
import { answerQuery, renderAnswerMarkdown } from "@/lib/ai";
import { readAssetsFile } from "@/lib/assets-store";
import { readClientsFile } from "@/lib/clients-store";
import { readProjectsFile } from "@/lib/projects-store";
import { readRecurringsFile } from "@/lib/recurrings-store";
import { readFinanceFile } from "@/lib/finance-store";
import { readBelongingsFile } from "@/lib/belongings-store";
import { readCalendarFile } from "@/lib/calendar-store";
import { readJobsFile } from "@/lib/jobs-store";
import { readSkillsFile } from "@/lib/skills-store";
import { readLibraryFile } from "@/lib/library-store";
import { readSecretsFile } from "@/lib/secrets-store";
import { nowIso, readStore, uid, writeStore } from "@/lib/store";
import { SecretPublic } from "@/lib/types";

function toSecretPublic(s: {
  id: string;
  name: string;
  category: string;
  tags: string[];
  notes: string;
  valueCiphertext: string;
  createdAt: string;
  updatedAt: string;
}): SecretPublic {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    tags: s.tags,
    notes: s.notes,
    hasValue: Boolean(s.valueCiphertext),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

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

  const [store, assetsFile, secretsFile, projectsFile, clientsFile, recurringsFile, financeFile, belongingsFile, calendarFile, jobsFile, skillsFile, libraryFile] = await Promise.all([
    readStore(),
    readAssetsFile(),
    readSecretsFile(),
    readProjectsFile(),
    readClientsFile(),
    readRecurringsFile(),
    readFinanceFile(),
    readBelongingsFile(),
    readCalendarFile(),
    readJobsFile(),
    readSkillsFile(),
    readLibraryFile(),
  ]);

  const userMsg = {
    id: uid("msg"),
    role: "user" as const,
    content: message,
    createdAt: nowIso(),
  };

  // Pass metadata-only secrets — never ciphertext or plaintext
  const answer = answerQuery(message, store, {
    assets: assetsFile.assets,
    secrets: secretsFile.secrets.map(toSecretPublic),
    projects: projectsFile.projects,
    clients: clientsFile.clients,
    subscriptions: clientsFile.subscriptions,
    recurrings: recurringsFile.recurrings,
    finance: financeFile.transactions,
    belongings: belongingsFile.belongings,
    calendarEvents: calendarFile.events,
    jobs: jobsFile.jobs,
    skills: skillsFile.skills,
    library: libraryFile.items,
  });
  const html = renderAnswerMarkdown(answer.title, answer.text);
  const assistantMsg = {
    id: uid("msg"),
    role: "assistant" as const,
    content: answer.title ? `${answer.title}\n${answer.text}` : answer.text,
    html,
    createdAt: nowIso(),
  };

  store.chatHistory.push(userMsg, assistantMsg);
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
