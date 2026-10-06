import { NextRequest, NextResponse } from "next/server";
import { readAssetsFile } from "@/lib/assets-store";
import { readBelongingsFile } from "@/lib/belongings-store";
import { readCalendarFile } from "@/lib/calendar-store";
import { readClientsFile } from "@/lib/clients-store";
import { readFinanceFile } from "@/lib/finance-store";
import { readJobsFile } from "@/lib/jobs-store";
import { readLibraryFile } from "@/lib/library-store";
import { readProjectsFile } from "@/lib/projects-store";
import { readRecurringsFile } from "@/lib/recurrings-store";
import { readSecretsFile } from "@/lib/secrets-store";
import { readSkillsFile } from "@/lib/skills-store";
import {
  migratePgVector,
  reindexWorkspace,
  resetPgPool,
  testPgConnection,
} from "@/lib/pgvector";
import { readLlmSettings } from "@/lib/llm-store";
import { readStore } from "@/lib/store";
import type { AiExtras } from "@/lib/ai";

async function loadExtras(): Promise<{ store: Awaited<ReturnType<typeof readStore>>; extras: AiExtras }> {
  const [
    store,
    assetsFile,
    secretsFile,
    projectsFile,
    clientsFile,
    recurringsFile,
    financeFile,
    belongingsFile,
    calendarFile,
    jobsFile,
    skillsFile,
    libraryFile,
  ] = await Promise.all([
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
  return {
    store,
    extras: {
      assets: assetsFile.assets,
      secrets: secretsFile.secrets.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        tags: s.tags,
        notes: s.notes,
        hasValue: Boolean(s.valueCiphertext),
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      })),
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
    },
  };
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "test");
  await resetPgPool();

  if (action === "test") {
    return NextResponse.json(await testPgConnection());
  }
  if (action === "migrate") {
    return NextResponse.json(await migratePgVector());
  }
  if (action === "reindex") {
    const settings = await readLlmSettings();
    const { store, extras } = await loadExtras();
    const result = await reindexWorkspace(store, extras, settings.ragModules);
    return NextResponse.json(result);
  }
  return NextResponse.json({ ok: false, message: "Unknown action" }, { status: 400 });
}
