import { TaskWorkspace } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";
import { nowIso, readStore, uid, writeStore } from "./store";

const KEY = "task-workspaces";

export const DEFAULT_WORKSPACE_NAME = "Personal";

export type TaskWorkspacesFile = { workspaces: TaskWorkspace[] };

function seedWorkspace(name: string): TaskWorkspace {
  const ts = nowIso();
  return { id: uid("wspace"), name, createdAt: ts, updatedAt: ts };
}

export async function readTaskWorkspacesFile(): Promise<TaskWorkspacesFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<TaskWorkspacesFile>(
      "task-workspaces.json"
    );
    const workspaces = Array.isArray(legacy?.workspaces)
      ? legacy!.workspaces
      : [];
    if (workspaces.length === 0) {
      return { workspaces: [seedWorkspace(DEFAULT_WORKSPACE_NAME)] };
    }
    return { workspaces };
  });
}

export async function writeTaskWorkspacesFile(
  data: TaskWorkspacesFile
): Promise<void> {
  await setDoc(KEY, data);
}

/**
 * Returns the workspace list, lazily seeding a default and assigning
 * tasks that have no workspaceId yet (pre-workspace data) to it.
 */
export async function ensureTaskWorkspaces(): Promise<TaskWorkspace[]> {
  let file = await readTaskWorkspacesFile();
  if (file.workspaces.length === 0) {
    file = { workspaces: [seedWorkspace(DEFAULT_WORKSPACE_NAME)] };
    await writeTaskWorkspacesFile(file);
  }
  const defaultId = file.workspaces[0].id;
  const store = await readStore();
  if (store.tasks.some((t) => !t.workspaceId)) {
    store.tasks = store.tasks.map((t) =>
      t.workspaceId ? t : { ...t, workspaceId: defaultId }
    );
    await writeStore(store);
  }
  return file.workspaces;
}
