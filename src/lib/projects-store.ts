import { Project } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "projects";

export type ProjectsFile = { projects: Project[] };

export async function readProjectsFile(): Promise<ProjectsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<ProjectsFile>("projects.json");
    return { projects: Array.isArray(legacy?.projects) ? legacy!.projects : [] };
  });
}

export async function writeProjectsFile(data: ProjectsFile): Promise<void> {
  await setDoc(KEY, data);
}
