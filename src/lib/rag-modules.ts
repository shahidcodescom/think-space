export const RAG_MODULE_IDS = [
  "notes",
  "tasks",
  "meetings",
  "thoughts",
  "memories",
  "secrets",
  "assets",
  "projects",
  "clients",
  "recurrings",
  "finance",
  "belongings",
  "calendar",
  "jobs",
  "skills",
  "library",
] as const;

export type RagModuleId = (typeof RAG_MODULE_IDS)[number];
