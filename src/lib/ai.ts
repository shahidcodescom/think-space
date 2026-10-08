import {
  formatSecretMetaLine,
  type SecretContextMeta,
} from "./secret-safe";
import {
  AnswerLink,
  appendGoToFooter,
  buildCatalog,
  dedupeLinks,
  inferItemLinksFromText,
  linksFromMarkdown,
  mdOpen,
  modulesFromTitleOrQuery,
  sectionLink,
} from "./ai-links";
import { stripHtml } from "./sanitize";
import { Asset, Belonging, CalendarEvent, Client, FinanceFixedItem,
  FinanceTransaction, JobApplication, LibraryItem, Project, Recurring, Skill, StoreData, Subscription } from "./types";
import { summarizeMonth } from "./finance-store";


export type { AnswerLink } from "./ai-links";

export type AiAnswer = {
  text: string;
  title?: string;
  links?: AnswerLink[];
};

/** Extra workspace data for the rule-based assistant (secrets = metadata only). */
export type AiExtras = {
  assets?: Asset[];
  /** Allowlisted metadata only — never ciphertext, plaintext, notes, or tags. */
  secrets?: SecretContextMeta[];
  projects?: Project[];
  clients?: Client[];
  subscriptions?: Subscription[];
  recurrings?: Recurring[];
  finance?: FinanceTransaction[];
  fixedFinance?: FinanceFixedItem[];
  belongings?: Belonging[];
  calendarEvents?: CalendarEvent[];
  jobs?: JobApplication[];
  skills?: Skill[];
  library?: LibraryItem[];
};

function formatDate(isoDate: string): string {
  try {
    const d = new Date(isoDate.includes("T") ? isoDate : `${isoDate}T12:00:00`);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return isoDate;
  }
}

function formatAssetLine(a: Asset): string {
  const bits = [
    `**${a.name}**`,
    a.type,
    a.status,
    a.serial ? `ID ${a.serial}` : null,
    a.location || null,
  ].filter(Boolean);
  return `${bits.join(" · ")} — ${mdOpen("assets", a.id)}`;
}

function formatSecretLine(s: SecretContextMeta): string {
  return formatSecretMetaLine(s, mdOpen("secrets", s.id, "Open in Secrets"));
}

function formatProjectLine(p: Project): string {
  const label = p.status === "live" ? "Live / Released" : "In progress";
  const tags = p.tags.length ? ` · ${p.tags.join(", ")}` : "";
  return `**${p.name}** — ${label}${tags}: ${p.description || "No description"} — ${mdOpen("projects", p.id)}`;
}

export function enrichAnswer(
  answer: AiAnswer,
  query: string,
  store: StoreData,
  extras: AiExtras = {}
): AiAnswer {
  const modules = modulesFromTitleOrQuery(answer.title, query);
  const catalog = buildCatalog(store, extras);
  const sectionLinks = modules.map(sectionLink);
  const links = dedupeLinks([
    ...(answer.links || []),
    ...linksFromMarkdown(answer.text),
    ...inferItemLinksFromText(answer.text, catalog),
    ...sectionLinks,
  ]).slice(0, 16);
  return {
    ...answer,
    text: appendGoToFooter(answer.text, sectionLinks),
    links,
  };
}

export function answerQuery(
  query: string,
  store: StoreData,
  extras: AiExtras = {}
): AiAnswer {
  return enrichAnswer(computeAnswer(query, store, extras), query, store, extras);
}

function computeAnswer(
  query: string,
  store: StoreData,
  extras: AiExtras = {}
): AiAnswer {
  const q = query.toLowerCase().trim();
  const assets = extras.assets || [];
  const secrets = extras.secrets || [];
  const projects = extras.projects || [];
  const clients = extras.clients || [];
  const subscriptions = extras.subscriptions || [];
  const recurrings = extras.recurrings || [];
  const finance = extras.finance || [];
  const belongings = extras.belongings || [];
  const calendarEvents = extras.calendarEvents || [];
  const jobs = extras.jobs || [];
  const skills = extras.skills || [];
  const library = extras.library || [];

  if (/list.*notes|my notes|show.*notes|what.*notes/.test(q)) {
    if (store.notes.length === 0) {
      return { text: "You have no notes yet. Create one from Notes.", title: "Your active notes" };
    }
    const lines = store.notes.map((n) => `**${n.title}**: ${stripHtml(n.content)}`);
    return { text: lines.join("\n"), title: "Your active notes" };
  }

  if (/list.*tasks|my tasks|show.*tasks|open tasks|pending/.test(q)) {
    const open = store.tasks.filter((t) => !t.done);
    const done = store.tasks.filter((t) => t.done);
    if (store.tasks.length === 0) {
      return { text: "You have no tasks yet.", title: "Your tasks" };
    }
    const parts: string[] = [];
    if (open.length) {
      parts.push("**Open**");
      open.forEach((t) => parts.push(`- ${t.title}`));
    }
    if (done.length) {
      parts.push("**Done**");
      done.forEach((t) => parts.push(`- ${t.title}`));
    }
    return { text: parts.join("\n"), title: "Your tasks" };
  }

  if (/list.*meetings|my meetings|show.*meetings|upcoming meetings/.test(q)) {
    if (store.meetings.length === 0) {
      return { text: "You have no meetings yet.", title: "Your meetings" };
    }
    const lines = store.meetings.map(
      (m) =>
        `**${m.title}** — ${formatDate(m.date)} · ${m.participants.join(", ")}`
    );
    return { text: lines.join("\n"), title: "Your meetings" };
  }

  if (/list.*memor|my memor|show.*memor/.test(q)) {
    if (store.memories.length === 0) {
      return { text: "You have no memories yet.", title: "Your memories" };
    }
    const lines = store.memories.map((m) => `**${m.title}**: ${m.content}`);
    return { text: lines.join("\n"), title: "Your memories" };
  }

  if (/list.*thought|my thought|show.*thought/.test(q)) {
    if (store.thoughts.length === 0) {
      return { text: "You have no thoughts yet.", title: "Your thoughts" };
    }
    const lines = store.thoughts.map((t) => `**${t.title}**: ${t.content}`);
    return { text: lines.join("\n"), title: "Your thoughts" };
  }

  if (/list.*assets|my assets|show.*assets|what.*assets/.test(q)) {
    if (assets.length === 0) {
      return {
        text: "You have no assets yet. Add one from Assets.",
        title: "Your assets",
      };
    }
    const lines = assets.map((a) => formatAssetLine(a));
    return { text: lines.join("\n"), title: "Your assets" };
  }

  if (/list.*secrets|my secrets|show.*secrets|what.*secrets/.test(q)) {
    if (secrets.length === 0) {
      return {
        text: "You have no secrets yet. [Open Secrets](/secrets) to add one. Values stay encrypted until you reveal them there.",
        title: "Your secrets",
      };
    }
    const lines = secrets.map((s) => formatSecretLine(s));
    return {
      text:
        lines.join("\n") +
        "\n\nValues are hidden here — use **Open in Secrets** to reveal or copy.",
      title: "Your secrets",
    };
  }

  if (/list.*projects|my projects|show.*projects|what.*projects|list.*products|my products|show.*products/.test(q)) {
    if (projects.length === 0) {
      return {
        text: "You have no projects yet. Add one from Projects.",
        title: "Your projects",
      };
    }
    const active = projects.filter((p) => p.status === "in_progress");
    const live = projects.filter((p) => p.status === "live");
    const parts: string[] = [];
    if (active.length) {
      parts.push("**In progress**");
      active.forEach((p) => parts.push(`- ${formatProjectLine(p)}`));
    }
    if (live.length) {
      parts.push("**Live / Released**");
      live.forEach((p) => parts.push(`- ${formatProjectLine(p)}`));
    }
    return { text: parts.join("\n"), title: "Your projects" };
  }

  if (/list.*clients|my clients|show.*clients|what.*clients/.test(q)) {
    if (clients.length === 0) {
      return { text: "You have no clients yet. Add one from Clients.", title: "Your clients" };
    }
    const lines = clients.map((c) => {
      const company = c.company ? ` · ${c.company}` : "";
      return `**${c.name}**${company}${c.email ? ` · ${c.email}` : ""}`;
    });
    return { text: lines.join("\n"), title: "Your clients" };
  }

  if (/list.*subscriptions|my subscriptions|client subscriptions|show.*subscriptions/.test(q)) {
    if (subscriptions.length === 0) {
      return {
        text: "No client subscriptions yet. Add them under Clients.",
        title: "Client subscriptions",
      };
    }
    const clientName = (id: string) =>
      clients.find((c) => c.id === id)?.name || id;
    const lines = subscriptions.map((s) => {
      return `**${s.plan}** · ${clientName(s.clientId)} · ${s.status} · renews ${s.renewalDate || "—"} · ${s.amount} ${s.currency}/${s.billingPeriod}`;
    });
    return { text: lines.join("\n"), title: "Client subscriptions" };
  }

  if (/upcoming renewals|renewals|renewal/.test(q)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const projectName = (id: string) =>
      projects.find((p) => p.id === id)?.name || id;
    const clientName = (id: string) =>
      clients.find((c) => c.id === id)?.name || id;
    const rows = subscriptions
      .filter((s) => s.status !== "cancelled" && s.renewalDate)
      .map((s) => {
        const d = new Date(`${s.renewalDate}T12:00:00`);
        const days = Math.round((d.getTime() - today.getTime()) / 86400000);
        return { s, days, d };
      })
      .filter(({ s, days }) => s.status === "past_due" || days < 0 || (days >= 0 && days <= 30))
      .sort((a, b) => a.days - b.days);
    if (!rows.length) {
      return {
        text: "No renewals in the next 30 days (and nothing past due).",
        title: "Upcoming renewals",
      };
    }
    const lines = rows.map(({ s, days }) => {
      const when =
        days < 0 || s.status === "past_due"
          ? `overdue (${s.renewalDate})`
          : `in ${days}d (${s.renewalDate})`;
      return `**${clientName(s.clientId)}** · ${s.plan} · ${projectName(s.projectId)} · ${when} · ${s.amount} ${s.currency}`;
    });
    return { text: lines.join("\n"), title: "Upcoming renewals" };
  }

  if (/list.*recurring|my recurring|show.*recurring|my subs\b|personal subs/.test(q)) {
    if (recurrings.length === 0) {
      return {
        text: "You have no personal recurrings yet. Add one from Recurrings.",
        title: "Your recurrings",
      };
    }
    const lines = recurrings.map((r) => {
      return `**${r.name}** · ${r.category} · ${r.amount} ${r.currency}/${r.billingPeriod} · due ${r.nextDueDate || "—"} · ${r.status}`;
    });
    return { text: lines.join("\n"), title: "Your recurrings" };
  }

  if (/upcoming dues|personal renewals|recurring dues/.test(q)) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(today);
    end.setDate(end.getDate() + 30);
    const rows = recurrings
      .filter((r) => r.status === "active" && r.nextDueDate)
      .map((r) => {
        const d = new Date(`${r.nextDueDate}T12:00:00`);
        const days = Math.round((d.getTime() - today.getTime()) / 86400000);
        return { r, days };
      })
      .filter(({ days }) => days < 0 || (days >= 0 && days <= 30))
      .sort((a, b) => a.days - b.days);
    if (!rows.length) {
      return {
        text: "No personal dues in the next 30 days.",
        title: "Upcoming dues",
      };
    }
    const lines = rows.map(({ r, days }) => {
      const when = days < 0 ? `overdue (${r.nextDueDate})` : `in ${days}d (${r.nextDueDate})`;
      return `**${r.name}** · ${r.amount} ${r.currency} · ${when}`;
    });
    return { text: lines.join("\n"), title: "Upcoming dues" };
  }

  if (/finance summary|this month.?s? finance|finance overview|my finance|list.*expenses|list.*income|money summary/.test(q)) {
    const month = new Date().toISOString().slice(0, 7);
    const fixed = extras.fixedFinance || [];
    const sum = summarizeMonth(finance, month, fixed);
    const lines = [
      `**Month:** ${month}`,
      `**Income:** ${sum.income} (txns ${sum.txnIncome} + fixed ${sum.fixedIncome})`,
      `**Expenses:** ${sum.expenses} (txns ${sum.txnExpenses} + fixed ${sum.fixedExpenses})`,
      `**Net:** ${sum.net}`,
      `**Open lends:** ${sum.openLendCount} (outstanding ${sum.outstandingLends})`,
      `**Open dues:** ${sum.openDueCount} (outstanding ${sum.outstandingDues})`,
      `**Transactions this month:** ${sum.transactionCount}`,
    ];
    return { text: lines.join("\n"), title: "Finance summary" };
  }

  if (/outstanding lends|my lends|money i lent|open lends/.test(q)) {
    const rows = finance.filter((t) => t.type === "lend" && t.status !== "settled");
    if (!rows.length) {
      return { text: "No open lends — everyone has repaid you.", title: "Open lends" };
    }
    const lines = rows.map((t) => {
      const left = Math.max(0, t.amount - (t.amountSettled || 0));
      return `**${t.counterparty || t.category}** · ${left} ${t.currency} left of ${t.amount} · ${t.status}`;
    });
    return { text: lines.join("\n"), title: "Open lends" };
  }

  if (/outstanding dues|money i owe|open dues|what do i owe/.test(q)) {
    const rows = finance.filter((t) => t.type === "due" && t.status !== "settled");
    if (!rows.length) {
      return { text: "No open dues — you are all clear.", title: "Open dues" };
    }
    const lines = rows.map((t) => {
      const left = Math.max(0, t.amount - (t.amountSettled || 0));
      return `**${t.counterparty || t.category}** · ${left} ${t.currency} left of ${t.amount} · ${t.status}`;
    });
    return { text: lines.join("\n"), title: "Open dues" };
  }

  if (/list.*belonging|my belonging|show.*belonging|inventory of belongings|where.*(kept|stored)|\b(list|show|see|open|what'?s in|whats in)\b[^?]*\bkeep\b/.test(q)) {
    if (belongings.length === 0) {
      return {
        text: "You have no items in Keep yet. Add one from Keep.",
        title: "Keep",
      };
    }
    const lines = belongings.map((b) => {
      const st =
        b.status === "with_me"
          ? "with me"
          : b.status === "lent_out"
            ? "lent out"
            : b.status;
      return `**${b.name}** · ${b.category} · ${b.location || "—"} · ${st}`;
    });
    return { text: lines.join("\n"), title: "Keep" };
  }

  {
    const whereMatch = q.match(
      /(?:where(?:'?s| is| are)?|locate|find)\s+(?:my\s+)?(.+?)\s*\??$/i
    );
    if (whereMatch || /where is|where are|where'?s/.test(q)) {
      const needle = (whereMatch ? whereMatch[1] : q.replace(/where(?:'?s| is| are)?\s*(?:my\s+)?/i, ""))
        .replace(/\?+$/, "")
        .trim()
        .toLowerCase();
      if (needle && needle.length >= 2 && !/^(are you|you|i|we|they)$/.test(needle)) {
        const hits = belongings.filter((b) =>
          `${b.name} ${b.category} ${b.tags.join(" ")} ${b.photoNote}`.toLowerCase().includes(needle)
        );
        if (hits.length) {
          const lines = hits.map((b) => {
            const st =
              b.status === "with_me"
                ? "with me"
                : b.status === "lent_out"
                  ? "lent out"
                  : b.status;
            return `**${b.name}** is at **${b.location || "—"}** (${st})${b.notes ? ` — ${b.notes}` : ""}`;
          });
          return { text: lines.join("\n"), title: "Where it is" };
        }
        // fall through to keyword search if no belonging hit
      }
    }
  }

  if (/upcoming appointments|list.*appointments|my calendar|upcoming events|show.*calendar/.test(q)) {
    const now = Date.now();
    const end = now + 21 * 86400000;
    const rows = calendarEvents
      .filter((e) => e.status !== "cancelled")
      .filter((e) => {
        const t = new Date(e.start).getTime();
        return t >= now - 3600000 && t <= end;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    if (!rows.length) {
      return {
        text: "No upcoming appointments in the next 3 weeks.",
        title: "Upcoming appointments",
      };
    }
    const lines = rows.map((e) => {
      const when = formatDate(e.start);
      const time = new Date(e.start).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `**${e.title}** · ${e.type} · ${when} ${time} · ${e.status}`;
    });
    return { text: lines.join("\n"), title: "Upcoming appointments" };
  }

  if (/job applications|list.*jobs|my jobs|job hunt|applications status|show.*applications/.test(q)) {
    if (jobs.length === 0) {
      return {
        text: "You have no job applications yet. Add one from Jobs.",
        title: "Job applications",
      };
    }
    const lines = jobs.map((j) => {
      const loc = j.remote ? "remote" : j.location || "—";
      return `**${j.company}** · ${j.role} · ${j.status.replace(/_/g, " ")} · ${loc}`;
    });
    return { text: lines.join("\n"), title: "Job applications" };
  }

  if (/upcoming interviews|next interviews|scheduled interviews/.test(q)) {
    const rows = jobs
      .filter((j) => j.nextInterviewAt && !["abandoned", "rejected", "failed", "accepted"].includes(j.status))
      .map((j) => ({
        j,
        t: new Date(j.nextInterviewAt).getTime(),
      }))
      .filter(({ t }) => Number.isFinite(t))
      .sort((a, b) => a.t - b.t);
    if (!rows.length) {
      return {
        text: "No upcoming interviews scheduled on your job applications.",
        title: "Upcoming interviews",
      };
    }
    const lines = rows.map(({ j }) => {
      const when = formatDate(j.nextInterviewAt);
      const time = new Date(j.nextInterviewAt).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      return `**${j.company}** · ${j.role} · ${when} ${time} · ${j.status.replace(/_/g, " ")}`;
    });
    return { text: lines.join("\n"), title: "Upcoming interviews" };
  }

  if (/list.*skills|my skills|skills i have|skills to learn|show.*skills/.test(q)) {
    if (skills.length === 0) {
      return {
        text: "You have no skills tracked yet. Add some from Skills.",
        title: "Your skills",
      };
    }
    const have = skills.filter((s) => s.status === "have");
    const learn = skills.filter((s) => s.status !== "have");
    const lines: string[] = [];
    if (have.length) {
      lines.push("**Skills I have**");
      for (const s of have) {
        lines.push(`- **${s.name}** · ${s.category}${s.proficiency ? ` · ${s.proficiency}` : ""}`);
      }
    }
    if (learn.length) {
      lines.push("**Skills to learn**");
      for (const s of learn) {
        const pr = s.priority != null ? ` · P${s.priority}` : "";
        lines.push(`- **${s.name}** · ${s.status}${pr}`);
      }
    }
    return { text: lines.join("\n"), title: "Your skills" };
  }

  if (/list.*library|my library|saved (links|references)|study later|show.*library/.test(q)) {
    if (library.length === 0) {
      return {
        text: "Your library is empty. Save a link or upload a file from Library.",
        title: "Your library",
      };
    }
    const lines = library.map((i) => {
      const tags = i.tags.length ? ` · ${i.tags.join(", ")}` : "";
      const link = i.url ? ` — ${i.url}` : i.fileName ? ` — file: ${i.fileName}` : "";
      return `**${i.title}** (${i.type})${tags}${link}`;
    });
    return { text: lines.join("\n"), title: "Your library" };
  }

  if (/product planning|meeting.*product/.test(q)) {
    const m = store.meetings.find((x) => /product planning/i.test(x.title));
    if (m) {
      return {
        title: m.title,
        text: [
          `**Date:** ${formatDate(m.date)}`,
          `**Participants:** ${m.participants.join(", ")}`,
          `**Agenda:** ${m.agenda}`,
          `**Minutes:** ${m.minutes}`,
          `**Decisions:** ${m.decisions}`,
        ].join("\n"),
      };
    }
  }

  if (/at a glance|workspace (summary|overview)|summarise( my)? workspace|summarize( my)? workspace|\boverview\b/.test(q)) {
    const openTasks = store.tasks.filter((t) => !t.done).length;
    const openLends = finance.filter((t) => t.type === "lend" && t.status !== "settled").length;
    const openDues = finance.filter((t) => t.type === "due" && t.status !== "settled").length;
    const upcomingAppts = calendarEvents.filter((e) => {
      if (e.status === "cancelled") return false;
      const t = new Date(e.start).getTime();
      return t >= Date.now() && t <= Date.now() + 14 * 86400000;
    }).length;
    const activeJobs = jobs.filter(
      (j) => !["abandoned", "rejected", "failed", "accepted"].includes(j.status)
    ).length;
    const skillsHave = skills.filter((s) => s.status === "have").length;
    const skillsLearn = skills.filter((s) => s.status !== "have").length;
    return {
      title: "At a glance",
      text: [
        `**Notes:** ${store.notes.length}`,
        `**Tasks:** ${store.tasks.length} (${openTasks} open)`,
        `**Meetings:** ${store.meetings.length}`,
        `**Thoughts:** ${store.thoughts.length}`,
        `**Memories:** ${store.memories.length}`,
        `**Assets:** ${assets.length}`,
        `**Secrets:** ${secrets.length}`,
        `**Projects:** ${projects.length} (${projects.filter((p) => p.status === "in_progress").length} in progress · ${projects.filter((p) => p.status === "live").length} live)`,
        `**Clients:** ${clients.length}`,
        `**Subscriptions:** ${subscriptions.length}`,
        `**Recurrings:** ${recurrings.length}`,
        `**Finance txns:** ${finance.length} (${openLends} open lends · ${openDues} open dues)`,
        `**Keep:** ${belongings.length}`,
        `**Calendar:** ${calendarEvents.filter((e) => e.status !== "cancelled").length} (${upcomingAppts} upcoming)`,
        `**Jobs:** ${jobs.length} (${activeJobs} active)`,
        `**Skills:** ${skills.length} (${skillsHave} have · ${skillsLearn} to learn)`,
        `**Library:** ${library.length}`,
      ].join("\n"),
    };
  }

  if (/hello|hi\b|hey|good morning|good evening/.test(q)) {
    return {
      title: "Hello",
      text: `Hi ${store.profile.name.split(" ")[0]}. Ask me to list notes, tasks, meetings, thoughts, memories, assets, secrets, projects, clients, subscriptions, recurrings, finance, keep, calendar, jobs, skills, or library — or summarise your workspace.`,
    };
  }

  if (/help|what can you/.test(q)) {
    return {
      title: "How I can help",
      text: [
        "Try asking:",
        "- List my notes",
        "- List my tasks",
        "- Show my meetings",
        "- List my thoughts",
        "- List my memories",
        "- List my secrets (names only — never values)",
        "- List my assets",
        "- List my projects",
        "- List my clients",
        "- List my subscriptions",
        "- Upcoming renewals",
        "- List my recurrings",
        "- Upcoming dues",
        "- Finance summary",
        "- Outstanding lends",
        "- Outstanding dues",
        "- What's in my Keep",
        "- Where is my passport",
        "- Upcoming appointments",
        "- Job applications",
        "- Upcoming interviews",
        "- List my skills",
        "- List my library",
        "- At a glance",
        "- Tell me about Product planning",
        "I can also search by keyword across every module.",
      ].join("\n"),
    };
  }

  // Keyword search across local data
  const hits: string[] = [];
  for (const n of store.notes) {
    if (`${n.title} ${stripHtml(n.content)}`.toLowerCase().includes(q)) {
      hits.push(`Note · **${n.title}**: ${stripHtml(n.content)}`);
    }
  }
  for (const t of store.tasks) {
    if (t.title.toLowerCase().includes(q)) {
      hits.push(`Task · **${t.title}** (${t.done ? "done" : "open"})`);
    }
  }
  for (const m of store.meetings) {
    if (
      `${m.title} ${m.agenda} ${m.minutes} ${m.decisions}`.toLowerCase().includes(q)
    ) {
      hits.push(`Meeting · **${m.title}** — ${formatDate(m.date)}`);
    }
  }
  for (const th of store.thoughts) {
    if (`${th.title} ${th.content}`.toLowerCase().includes(q)) {
      hits.push(`Thought · **${th.title}**: ${th.content}`);
    }
  }
  for (const mem of store.memories) {
    if (`${mem.title} ${mem.content}`.toLowerCase().includes(q)) {
      hits.push(`Memory · **${mem.title}**: ${mem.content}`);
    }
  }
  for (const a of assets) {
    const hay = `${a.name} ${a.serial} ${a.tags.join(" ")} ${a.type} ${a.status} ${a.location} ${a.owner}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Asset · ${formatAssetLine(a)}`);
    }
  }
  for (const s of secrets) {
    // Metadata only — never notes/tags/ciphertext/values
    const hay = `${s.name} ${s.category} ${s.id}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Secret · ${formatSecretLine(s)}`);
    }
  }
  for (const p of projects) {
    const hay = `${p.name} ${p.description} ${p.tags.join(" ")} ${p.notes} ${p.status}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Project · ${formatProjectLine(p)}`);
    }
  }
  for (const c of clients) {
    const hay = `${c.name} ${c.email} ${c.company} ${c.notes}`.toLowerCase();
    if (hay.includes(q)) {
      const company = c.company ? ` · ${c.company}` : "";
      hits.push(`Client · **${c.name}**${company}`);
    }
  }
  for (const sub of subscriptions) {
    const hay = `${sub.plan} ${sub.status} ${sub.notes} ${sub.billingPeriod}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Subscription · **${sub.plan}** · ${sub.status} · renews ${sub.renewalDate || "—"}`);
    }
  }
  for (const r of recurrings) {
    const hay = `${r.name} ${r.category} ${r.notes} ${r.paymentMethod}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Recurring · **${r.name}** · ${r.amount} ${r.currency} due ${r.nextDueDate || "—"}`);
    }
  }
  for (const t of finance) {
    const hay = `${t.type} ${t.category} ${t.counterparty} ${t.notes}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Finance · **${t.type}** · ${t.category} · ${t.amount} ${t.currency} (${t.date})`);
    }
  }
  for (const b of belongings) {
    const hay = `${b.name} ${b.category} ${b.location} ${b.notes} ${b.tags.join(" ")} ${b.photoNote}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Keep · **${b.name}** · ${b.location || "—"}`);
    }
  }
  for (const e of calendarEvents) {
    const hay = `${e.title} ${e.type} ${e.location} ${e.bookerName}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Calendar · **${e.title}** · ${e.type} · ${formatDate(e.start)}`);
    }
  }
  for (const j of jobs) {
    const hay = `${j.company} ${j.role} ${j.location} ${j.notes} ${j.status}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Job · **${j.company}** · ${j.role} · ${j.status.replace(/_/g, " ")}`);
    }
  }
  for (const sk of skills) {
    const hay = `${sk.name} ${sk.category} ${sk.notes} ${sk.status}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Skill · **${sk.name}** · ${sk.status}`);
    }
  }
  for (const li of library) {
    const hay = `${li.title} ${li.notes} ${li.url} ${li.tags.join(" ")} ${li.type}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Library · **${li.title}** · ${li.type}`);
    }
  }

  if (hits.length) {
    return { title: "I found this", text: hits.join("\n") };
  }

  return {
    title: "Thinking…",
    text: `I searched your notes, tasks, meetings, thoughts, memories, assets, secrets, projects, clients, subscriptions, recurrings, finance, keep, calendar, jobs, skills, and library but did not find a match for “${query}”. Try “List my notes”, “List my assets”, or “At a glance”.`,
  };
}

export function renderAnswerMarkdown(title: string | undefined, text: string): string {
  const body = text
    .split("\n")
    .map((line) => {
      let withBold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Safe internal markdown links e.g. [Open in Secrets](/secrets?id=...)
      withBold = withBold.replace(
        /\[([^\]]+)\]\((\/(?:secrets|notes|assets|tasks|meetings|thoughts|memories|projects|clients|recurrings|finance|belongings|calendar|jobs|skills|library|thinking-space|profile|book)[^)]*)\)/g,
        '<a href="$2" class="inline-flex items-center rounded-full bg-sage-muted px-2.5 py-0.5 text-xs font-medium text-forest hover:bg-sage-light whitespace-nowrap no-underline">$1</a>'
      );
      if (withBold.startsWith("- ")) {
        return `<li>${withBold.slice(2)}</li>`;
      }
      if (withBold.includes(": ") && withBold.includes("<strong>")) {
        return `<li>${withBold}</li>`;
      }
      // Item lines with Open deep-links become list items
      if (/href="\/(?:notes|tasks|meetings|thoughts|memories|secrets|assets|projects|clients|recurrings|finance|belongings|calendar|jobs|skills|library)\?id=/.test(withBold)) {
        return `<li>${withBold}</li>`;
      }
      return `<p>${withBold}</p>`;
    })
    .join("");

  const hasLi = body.includes("<li>");
  let wrapped = body;
  if (hasLi) {
    const parts = body.split(/(?=<li>)|(?<=<\/li>)/).filter(Boolean);
    const out: string[] = [];
    let buf: string[] = [];
    for (const part of parts) {
      if (part.startsWith("<li>")) {
        buf.push(part);
      } else {
        if (buf.length) {
          out.push(`<ul class="list-disc pl-5 space-y-1">${buf.join("")}</ul>`);
          buf = [];
        }
        out.push(part);
      }
    }
    if (buf.length) {
      out.push(`<ul class="list-disc pl-5 space-y-1">${buf.join("")}</ul>`);
    }
    wrapped = out.join("");
  }

  return `${title ? `<h3 class="font-semibold text-forest mb-2">${title}</h3>` : ""}${wrapped}`;
}
