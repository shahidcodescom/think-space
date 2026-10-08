import { nowIso, uid } from "./store";
import { IntentAction, IntentDef } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "intents";

export const INTENT_ACTIONS: { value: IntentAction; label: string; query: string }[] = [
  { value: "list_notes", label: "List notes", query: "list my notes" },
  { value: "list_tasks", label: "List tasks", query: "list my tasks" },
  { value: "list_meetings", label: "List meetings", query: "list my meetings" },
  { value: "list_thoughts", label: "List thoughts", query: "list my thoughts" },
  { value: "list_memories", label: "List memories", query: "list my memories" },
  { value: "list_secrets", label: "List secrets", query: "list my secrets" },
  { value: "list_assets", label: "List assets", query: "list my assets" },
  { value: "list_projects", label: "List projects", query: "list my projects" },
  { value: "list_clients", label: "List clients", query: "list my clients" },
  { value: "list_recurrings", label: "List recurrings", query: "list my recurrings" },
  { value: "list_finance", label: "Finance summary", query: "finance summary" },
  { value: "list_belongings", label: "Show Keep", query: "what's in my keep" },
  { value: "list_calendar", label: "Upcoming appointments", query: "upcoming appointments" },
  { value: "list_jobs", label: "Job applications", query: "job applications" },
  { value: "list_skills", label: "List skills", query: "list my skills" },
  { value: "list_library", label: "List library", query: "list my library" },
  { value: "glance", label: "At a glance", query: "at a glance" },
  { value: "help", label: "Help", query: "help" },
];

export const DEFAULT_INTENTS: IntentDef[] = [
  {
    id: "intent-notes",
    name: "List notes",
    enabled: true,
    patterns: ["list.*notes", "my notes", "show.*notes", "what.*notes"],
    action: "list_notes",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-tasks",
    name: "List tasks",
    enabled: true,
    patterns: ["list.*tasks", "my tasks", "show.*tasks", "open tasks", "pending"],
    action: "list_tasks",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-meetings",
    name: "List meetings",
    enabled: true,
    patterns: ["list.*meetings", "my meetings", "show.*meetings", "upcoming meetings"],
    action: "list_meetings",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-secrets",
    name: "List secrets",
    enabled: true,
    patterns: ["list.*secrets", "my secrets", "show.*secrets", "what.*secrets"],
    action: "list_secrets",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-projects",
    name: "List projects",
    enabled: true,
    patterns: ["list.*projects", "my projects", "show.*projects", "list.*products"],
    action: "list_projects",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-jobs",
    name: "Job applications",
    enabled: true,
    patterns: ["job applications", "list.*jobs", "my jobs", "show.*jobs"],
    action: "list_jobs",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-finance",
    name: "Finance summary",
    enabled: true,
    patterns: ["finance summary", "money summary", "cashflow"],
    action: "list_finance",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-calendar",
    name: "Upcoming appointments",
    enabled: true,
    patterns: ["upcoming appointments", "my calendar", "upcoming events"],
    action: "list_calendar",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-glance",
    name: "At a glance",
    enabled: true,
    patterns: [
      "at a glance",
      "workspace (summary|overview)",
      "summarise( my)? workspace",
      "summarize( my)? workspace",
      "\\boverview\\b",
    ],
    action: "glance",
    updatedAt: new Date(0).toISOString(),
  },
  {
    id: "intent-help",
    name: "Help",
    enabled: true,
    patterns: ["help", "what can you"],
    action: "help",
    updatedAt: new Date(0).toISOString(),
  },
];

type IntentsFile = { intents: IntentDef[] };

async function readFile(): Promise<IntentsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<IntentsFile>("intents.json");
    if (legacy && Array.isArray(legacy.intents)) return legacy;
    return { intents: DEFAULT_INTENTS.map((i) => ({ ...i })) };
  });
}

export async function listIntents(): Promise<IntentDef[]> {
  const data = await readFile();
  return data.intents;
}

export async function saveIntents(intents: IntentDef[]): Promise<IntentDef[]> {
  const data = { intents };
  await setDoc(KEY, data);
  return intents;
}

export async function upsertIntent(
  patch: Partial<IntentDef> & {
    name: string;
    action: IntentAction;
    patterns: string[];
  }
): Promise<IntentDef> {
  const data = await readFile();
  const now = nowIso();
  if (patch.id) {
    const idx = data.intents.findIndex((i) => i.id === patch.id);
    if (idx >= 0) {
      data.intents[idx] = {
        ...data.intents[idx],
        ...patch,
        patterns: patch.patterns,
        updatedAt: now,
      };
      await setDoc(KEY, data);
      return data.intents[idx];
    }
  }
  const created: IntentDef = {
    id: uid("intent"),
    name: patch.name,
    enabled: patch.enabled !== false,
    patterns: patch.patterns,
    action: patch.action,
    updatedAt: now,
  };
  data.intents.push(created);
  await setDoc(KEY, data);
  return created;
}

export async function deleteIntent(id: string): Promise<boolean> {
  const data = await readFile();
  const before = data.intents.length;
  data.intents = data.intents.filter((i) => i.id !== id);
  if (data.intents.length === before) return false;
  await setDoc(KEY, data);
  return true;
}

export async function setIntentEnabled(
  id: string,
  enabled: boolean
): Promise<IntentDef | null> {
  const data = await readFile();
  const intent = data.intents.find((i) => i.id === id);
  if (!intent) return null;
  intent.enabled = enabled;
  intent.updatedAt = nowIso();
  await saveIntents(data.intents);
  return intent;
}

/** If an enabled intent matches, return the canonical query for rule handlers. */

export function matchIntentQuery(
  userQuery: string,
  intents: IntentDef[]
): { intent: IntentDef; canonicalQuery: string } | null {
  const q = userQuery.toLowerCase().trim();
  for (const intent of intents) {
    if (!intent.enabled || !intent.patterns.length) continue;
    for (const pat of intent.patterns) {
      try {
        if (new RegExp(pat, "i").test(q)) {
          const action = INTENT_ACTIONS.find((a) => a.value === intent.action);
          return {
            intent,
            canonicalQuery: action?.query || userQuery,
          };
        }
      } catch {
        /* invalid regex — skip */
      }
    }
  }
  return null;
}
