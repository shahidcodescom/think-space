import { promises as fs } from "fs";
import path from "path";
import { Project } from "./types";

const PROJECTS_PATH = path.join(process.cwd(), "data", "projects.json");

export type ProjectsFile = { projects: Project[] };

export async function readProjectsFile(): Promise<ProjectsFile> {
  try {
    const raw = await fs.readFile(PROJECTS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ProjectsFile;
    return { projects: Array.isArray(parsed.projects) ? parsed.projects : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: ProjectsFile = { projects: [] };
      await writeProjectsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeProjectsFile(data: ProjectsFile): Promise<void> {
  await fs.writeFile(
    PROJECTS_PATH,
    JSON.stringify(data, null, 2) + "\n",
    "utf-8"
  );
}
