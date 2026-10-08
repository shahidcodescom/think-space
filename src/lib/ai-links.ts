/** Structured redirects for Thinking space replies. */

export type AnswerLink = {
  href: string;
  label: string;
};

export type WorkspaceModule =
  | "notes"
  | "tasks"
  | "meetings"
  | "thoughts"
  | "memories"
  | "secrets"
  | "assets"
  | "projects"
  | "clients"
  | "recurrings"
  | "finance"
  | "belongings"
  | "calendar"
  | "jobs"
  | "skills"
  | "library";

export const MODULE_META: Record<
  WorkspaceModule,
  { path: string; label: string; openLabel: string }
> = {
  notes: { path: "/notes", label: "Notes", openLabel: "Open Notes" },
  tasks: { path: "/tasks", label: "Tasks", openLabel: "Open Tasks" },
  meetings: { path: "/meetings", label: "Meetings", openLabel: "Open Meetings" },
  thoughts: { path: "/thoughts", label: "Thoughts", openLabel: "Open Thoughts" },
  memories: { path: "/memories", label: "Memories", openLabel: "Open Memories" },
  secrets: { path: "/secrets", label: "Secrets", openLabel: "Open Secrets" },
  assets: { path: "/assets", label: "Assets", openLabel: "Open Assets" },
  projects: { path: "/projects", label: "Projects", openLabel: "Open Projects" },
  clients: { path: "/clients", label: "Clients", openLabel: "Open Clients" },
  recurrings: {
    path: "/recurrings",
    label: "Recurrings",
    openLabel: "Open Recurrings",
  },
  finance: { path: "/finance", label: "Finance", openLabel: "Open Finance" },
  belongings: {
    path: "/belongings",
    label: "Keep",
    openLabel: "Open Keep",
  },
  calendar: { path: "/calendar", label: "Calendar", openLabel: "Open Calendar" },
  jobs: { path: "/jobs", label: "Jobs", openLabel: "Open Jobs" },
  skills: { path: "/skills", label: "Skills", openLabel: "Open Skills" },
  library: { path: "/library", label: "Library", openLabel: "Open Library" },
};

const SAFE_PATHS = new Set(
  Object.values(MODULE_META).map((m) => m.path).concat(["/thinking-space", "/profile", "/book"])
);

export function moduleHref(
  module: WorkspaceModule,
  id?: string | null
): string {
  const base = MODULE_META[module].path;
  if (!id) return base;
  return `${base}?id=${encodeURIComponent(id)}`;
}

export function sectionLink(module: WorkspaceModule): AnswerLink {
  const meta = MODULE_META[module];
  return { href: meta.path, label: meta.openLabel };
}

export function itemLink(
  module: WorkspaceModule,
  id: string,
  name: string
): AnswerLink {
  const short =
    name.length > 28 ? `${name.slice(0, 26).trimEnd()}…` : name;
  return {
    href: moduleHref(module, id),
    label: short,
  };
}

/** Inline markdown: — [Open](/notes?id=...) */
export function mdOpen(
  module: WorkspaceModule,
  id?: string | null,
  label?: string
): string {
  const meta = MODULE_META[module];
  const href = moduleHref(module, id);
  const text = label || (id ? "Open" : meta.openLabel);
  return `[${text}](${href})`;
}

export function dedupeLinks(links: AnswerLink[]): AnswerLink[] {
  const seen = new Set<string>();
  const out: AnswerLink[] = [];
  for (const link of links) {
    if (!link.href || seen.has(link.href)) continue;
    // Only allow internal app paths
    const pathOnly = link.href.split("?")[0];
    if (!SAFE_PATHS.has(pathOnly) && !pathOnly.startsWith("/book")) continue;
    seen.add(link.href);
    out.push(link);
  }
  return out;
}

/** Map answer titles / query phrases → modules for section chips. */
export function modulesFromTitleOrQuery(
  title: string | undefined,
  query: string
): WorkspaceModule[] {
  const hay = `${title || ""} ${query}`.toLowerCase();
  const found: WorkspaceModule[] = [];
  const rules: [RegExp, WorkspaceModule][] = [
    [/secret/, "secrets"],
    [/note/, "notes"],
    [/task/, "tasks"],
    [/meeting|mom/, "meetings"],
    [/thought/, "thoughts"],
    [/memor/, "memories"],
    [/asset/, "assets"],
    [/project|product/, "projects"],
    [/client|subscription|renewal/, "clients"],
    [/recurring|due(s)?\b/, "recurrings"],
    [/finance|lend|dues?|income|expense/, "finance"],
    [/belonging|\bkeep\b|where is|passport/, "belongings"],
    [/calendar|appointment|interview/, "calendar"],
    [/job|application/, "jobs"],
    [/skill/, "skills"],
    [/library/, "library"],
    [/glance|overview|workspace/, "notes"], // glance handled specially
  ];
  for (const [re, mod] of rules) {
    if (re.test(hay) && !found.includes(mod)) found.push(mod);
  }
  if (/at a glance|overview|workspace/.test(hay)) {
    return [
      "notes",
      "tasks",
      "meetings",
      "secrets",
      "projects",
      "clients",
      "finance",
      "calendar",
      "jobs",
      "skills",
      "library",
    ];
  }
  return found;
}

/** Parse markdown [label](/path?id=) from reply text into structured links. */
export function linksFromMarkdown(text: string): AnswerLink[] {
  const re =
    /\[([^\]]+)\]\((\/(?:notes|tasks|meetings|thoughts|memories|secrets|assets|projects|clients|recurrings|finance|belongings|calendar|jobs|skills|library|thinking-space|profile)[^)]*)\)/g;
  const out: AnswerLink[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    out.push({ label: m[1], href: m[2] });
  }
  return dedupeLinks(out);
}

export function appendGoToFooter(text: string, links: AnswerLink[]): string {
  const section = dedupeLinks(
    links.filter((l) => !l.href.includes("?id=")).slice(0, 8)
  );
  if (!section.length) return text;
  if (/^\*\*Go to:\*\*/m.test(text) || /\[Open (Notes|Tasks|Secrets)/.test(text)) {
    // Still ok to skip footer if already rich with opens
  }
  if (/\*\*Go to:\*\*/i.test(text)) return text;
  const parts = section.map((l) => `[${l.label}](${l.href})`);
  return `${text.trim()}\n\n**Go to:** ${parts.join(" · ")}`;
}

type Named = { id: string; name?: string; title?: string; company?: string; role?: string };

/** Match entity names mentioned in LLM/rule text and attach item deep links. */
export function inferItemLinksFromText(
  text: string,
  catalog: Partial<Record<WorkspaceModule, Named[]>>
): AnswerLink[] {
  const lower = text.toLowerCase();
  const links: AnswerLink[] = [];
  for (const [mod, items] of Object.entries(catalog) as [
    WorkspaceModule,
    Named[],
  ][]) {
    if (!items?.length) continue;
    for (const item of items.slice(0, 40)) {
      const name = (item.name || item.title || "").trim();
      if (name.length < 3) continue;
      if (lower.includes(name.toLowerCase())) {
        links.push(itemLink(mod, item.id, name));
      }
      // Jobs: company — role
      if (item.company && item.role) {
        const combo = `${item.company} — ${item.role}`;
        if (lower.includes(item.company.toLowerCase())) {
          links.push(itemLink(mod, item.id, combo));
        }
      }
    }
  }
  return dedupeLinks(links).slice(0, 12);
}

export function buildCatalog(store: {
  notes: { id: string; title: string }[];
  tasks: { id: string; title: string }[];
  meetings: { id: string; title: string }[];
  thoughts: { id: string; title: string }[];
  memories: { id: string; title: string }[];
}, extras: {
  secrets?: { id: string; name: string }[];
  assets?: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
  clients?: { id: string; name: string }[];
  recurrings?: { id: string; name: string }[];
  finance?: { id: string; category?: string; counterparty?: string }[];
  belongings?: { id: string; name: string }[];
  calendarEvents?: { id: string; title: string }[];
  jobs?: { id: string; company: string; role: string }[];
  skills?: { id: string; name: string }[];
  library?: { id: string; title: string }[];
}): Partial<Record<WorkspaceModule, Named[]>> {
  return {
    notes: store.notes.map((n) => ({ id: n.id, title: n.title })),
    tasks: store.tasks.map((t) => ({ id: t.id, title: t.title })),
    meetings: store.meetings.map((m) => ({ id: m.id, title: m.title })),
    thoughts: store.thoughts.map((t) => ({ id: t.id, title: t.title })),
    memories: store.memories.map((m) => ({ id: m.id, title: m.title })),
    secrets: (extras.secrets || []).map((s) => ({ id: s.id, name: s.name })),
    assets: (extras.assets || []).map((a) => ({ id: a.id, name: a.name })),
    projects: (extras.projects || []).map((p) => ({ id: p.id, name: p.name })),
    clients: (extras.clients || []).map((c) => ({ id: c.id, name: c.name })),
    recurrings: (extras.recurrings || []).map((r) => ({ id: r.id, name: r.name })),
    belongings: (extras.belongings || []).map((b) => ({ id: b.id, name: b.name })),
    calendar: (extras.calendarEvents || []).map((e) => ({
      id: e.id,
      title: e.title,
    })),
    jobs: (extras.jobs || []).map((j) => ({
      id: j.id,
      company: j.company,
      role: j.role,
      name: `${j.company} — ${j.role}`,
    })),
    skills: (extras.skills || []).map((s) => ({ id: s.id, name: s.name })),
    library: (extras.library || []).map((i) => ({ id: i.id, title: i.title })),
    finance: (extras.finance || []).map((t) => ({
      id: t.id,
      name: t.counterparty || t.category || "Transaction",
    })),
  };
}
