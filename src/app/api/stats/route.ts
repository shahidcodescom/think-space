import { NextResponse } from "next/server";
import { readAssetsFile } from "@/lib/assets-store";
import { readClientsFile } from "@/lib/clients-store";
import { readRecurringsFile } from "@/lib/recurrings-store";
import { readFinanceFile, remainingAmount } from "@/lib/finance-store";
import { readBelongingsFile } from "@/lib/belongings-store";
import { readCalendarFile } from "@/lib/calendar-store";
import { readJobsFile } from "@/lib/jobs-store";
import { readSkillsFile } from "@/lib/skills-store";
import { readLibraryFile } from "@/lib/library-store";
import { readProjectsFile } from "@/lib/projects-store";
import { readSecretsFile } from "@/lib/secrets-store";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const [store, assets, secrets, projects, billing, recurrings, finance, belongings, calendar, jobs, skills, library] = await Promise.all([
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
  const list = projects.projects;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(today);
  end.setDate(end.getDate() + 30);
  const upcomingRenewals = billing.subscriptions.filter((s) => {
    if (s.status === "cancelled" || !s.renewalDate) return false;
    const d = new Date(`${s.renewalDate}T12:00:00`);
    if (s.status === "past_due") return true;
    return d >= today && d <= end;
  }).length;

  return NextResponse.json({
    notes: store.notes.length,
    tasks: store.tasks.length,
    openTasks: store.tasks.filter((t) => !t.done).length,
    meetings: store.meetings.length,
    thoughts: store.thoughts.length,
    memories: store.memories.length,
    assets: assets.assets.length,
    secrets: secrets.secrets.length,
    projects: list.length,
    projectsInProgress: list.filter((p) => p.status === "in_progress").length,
    projectsLive: list.filter((p) => p.status === "live").length,
    clients: billing.clients.length,
    subscriptions: billing.subscriptions.length,
    upcomingRenewals,
    recurrings: recurrings.recurrings.length,
    upcomingRecurrings: recurrings.recurrings.filter((r) => {
      if (r.status === "cancelled" || !r.nextDueDate) return false;
      const d = new Date(`${r.nextDueDate}T12:00:00`);
      if (d < today) return r.status === "active";
      return r.status === "active" && d >= today && d <= end;
    }).length,
    financeTransactions: finance.transactions.length,
    openLends: finance.transactions.filter((t) => t.type === "lend" && t.status !== "settled").length,
    openDues: finance.transactions.filter((t) => t.type === "due" && t.status !== "settled").length,
    outstandingLends: finance.transactions
      .filter((t) => t.type === "lend" && t.status !== "settled")
      .reduce((s, t) => s + remainingAmount(t), 0),
    outstandingDues: finance.transactions
      .filter((t) => t.type === "due" && t.status !== "settled")
      .reduce((s, t) => s + remainingAmount(t), 0),
    belongings: belongings.belongings.length,
    belongingsMissing: belongings.belongings.filter((b) => b.status === "missing").length,
    belongingsLent: belongings.belongings.filter((b) => b.status === "lent_out").length,
    calendarEvents: calendar.events.filter((e) => e.status !== "cancelled").length,
    upcomingAppointments: calendar.events.filter((e) => {
      if (e.status === "cancelled") return false;
      const t = new Date(e.start).getTime();
      const now = Date.now();
      return t >= now && t <= now + 14 * 86400000;
    }).length,
    jobs: jobs.jobs.length,
    jobsActive: jobs.jobs.filter(
      (j) => !["abandoned", "rejected", "failed", "accepted"].includes(j.status)
    ).length,
    skills: skills.skills.length,
    skillsHave: skills.skills.filter((s) => s.status === "have").length,
    skillsLearning: skills.skills.filter(
      (s) => s.status === "learning" || s.status === "planned"
    ).length,
    library: library.items.length,
  });
}
