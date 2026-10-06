import { stripHtml } from "./sanitize";
import { StoreData } from "./types";

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

export function answerQuery(query: string, store: StoreData): { text: string; title?: string } {
  const q = query.toLowerCase().trim();

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

  if (/list.*meetings|my meetings|show.*meetings|upcoming/.test(q)) {
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
      ].join("\n"),
    };
  }

  if (/hello|hi\b|hey|good morning|good evening/.test(q)) {
    return {
      title: "Hello",
      text: `Hi ${store.profile.name.split(" ")[0]}. Ask me to list notes, tasks, meetings, thoughts, or memories — or summarise your workspace.`,
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

  if (hits.length) {
    return { title: "I found this", text: hits.join("\n") };
  }

  return {
    title: "Thinking…",
    text: `I searched your notes, tasks, meetings, thoughts, and memories but did not find a match for “${query}”. Try “List my notes” or “At a glance”.`,
  };
}

export function renderAnswerMarkdown(title: string | undefined, text: string): string {
  const body = text
    .split("\n")
    .map((line) => {
      const withBold = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
      if (withBold.startsWith("- ")) {
        return `<li>${withBold.slice(2)}</li>`;
      }
      if (withBold.includes(": ") && withBold.includes("<strong>")) {
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
