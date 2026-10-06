import { stripHtml } from "./sanitize";
import { Asset, Client, Project, Recurring, SecretPublic, StoreData, Subscription } from "./types";

/** Extra workspace data for the rule-based assistant (secrets = metadata only). */
export type AiExtras = {
  assets?: Asset[];
  /** Never include valueCiphertext or plaintext values. */
  secrets?: SecretPublic[];
  projects?: Project[];
  clients?: Client[];
  subscriptions?: Subscription[];
  recurrings?: Recurring[];
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
  return bits.join(" · ");
}

function formatSecretLine(s: SecretPublic): string {
  const tags = s.tags.length ? ` · ${s.tags.join(", ")}` : "";
  const notes = s.notes ? `: ${s.notes}` : "";
  // Metadata only + redirect into Secrets UI (never values)
  return `**${s.name}** (${s.category})${tags}${notes} — [Open in Secrets](/secrets?id=${s.id})`;
}

function formatProjectLine(p: Project): string {
  const label = p.status === "live" ? "Live / Released" : "In progress";
  const tags = p.tags.length ? ` · ${p.tags.join(", ")}` : "";
  return `**${p.name}** — ${label}${tags}: ${p.description || "No description"}`;
}

export function answerQuery(
  query: string,
  store: StoreData,
  extras: AiExtras = {}
): { text: string; title?: string } {
  const q = query.toLowerCase().trim();
  const assets = extras.assets || [];
  const secrets = extras.secrets || [];
  const projects = extras.projects || [];
  const clients = extras.clients || [];
  const subscriptions = extras.subscriptions || [];
  const recurrings = extras.recurrings || [];

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

  if (/list.*recurring|my recurring|show.*recurring|my subs\b|personal subs|list.*dues/.test(q)) {
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

  if (/at a glance|summary|overview|status/.test(q)) {
    return {
      title: "At a glance",
      text: [
        `**Notes:** ${store.notes.length}`,
        `**Tasks:** ${store.tasks.length} (${store.tasks.filter((t) => !t.done).length} open)`,
        `**Meetings:** ${store.meetings.length}`,
        `**Thoughts:** ${store.thoughts.length}`,
        `**Memories:** ${store.memories.length}`,
        `**Assets:** ${assets.length}`,
        `**Secrets:** ${secrets.length}`,
        `**Projects:** ${projects.length} (${projects.filter((p) => p.status === "in_progress").length} in progress · ${projects.filter((p) => p.status === "live").length} live)`,
        `**Clients:** ${clients.length}`,
        `**Subscriptions:** ${subscriptions.length}`,
        `**Recurrings:** ${recurrings.length}`,
      ].join("\n"),
    };
  }

  if (/hello|hi\b|hey|good morning|good evening/.test(q)) {
    return {
      title: "Hello",
      text: `Hi ${store.profile.name.split(" ")[0]}. Ask me to list notes, tasks, meetings, thoughts, memories, assets, secrets, projects, clients, or recurrings — or summarise your workspace.`,
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
        "- List my memories",
        "- List my assets",
        "- List my secrets (names only — never values)",
        "- List my projects",
        "- List my clients",
        "- Upcoming renewals",
        "- List my recurrings",
        "- Upcoming dues",
        "- At a glance",
        "- Tell me about Product planning",
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
    // Metadata only — never search ciphertext/values (they are not present on SecretPublic)
    const hay = `${s.name} ${s.category} ${s.tags.join(" ")} ${s.notes}`.toLowerCase();
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
  for (const r of recurrings) {
    const hay = `${r.name} ${r.category} ${r.notes} ${r.paymentMethod}`.toLowerCase();
    if (hay.includes(q)) {
      hits.push(`Recurring · **${r.name}** · ${r.amount} ${r.currency} due ${r.nextDueDate || "—"}`);
    }
  }

  if (hits.length) {
    return { title: "I found this", text: hits.join("\n") };
  }

  return {
    title: "Thinking…",
    text: `I searched your notes, tasks, meetings, thoughts, memories, assets, secrets, projects, clients, and recurrings but did not find a match for “${query}”. Try “List my notes”, “List my assets”, or “At a glance”.`,
  };
}

export function renderAnswerMarkdown(title: string | undefined, text: string): string {
  const body = text
    .split("\n")
    .map((line) => {
      let withBold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      // Safe internal markdown links e.g. [Open in Secrets](/secrets?id=...)
      withBold = withBold.replace(
        /\[([^\]]+)\]\((\/(?:secrets|notes|assets|tasks|meetings|thoughts|memories|projects|clients|recurrings|thinking-space|profile)[^)]*)\)/g,
        '<a href="$2" class="text-forest font-medium underline decoration-sage-dark/50 hover:decoration-forest whitespace-nowrap">$1</a>'
      );
      if (withBold.startsWith("- ")) {
        return `<li>${withBold.slice(2)}</li>`;
      }
      if (withBold.includes(": ") && withBold.includes("<strong>")) {
        return `<li>${withBold}</li>`;
      }
      // Secret/asset list lines without leading dash still get list treatment when they have Open link
      if (withBold.includes('href="/secrets?id=')) {
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
