import { promises as fs } from "fs";
import path from "path";
import { Skill } from "./types";

const DATA_PATH = path.join(process.cwd(), "data", "skills.json");

export type SkillsFile = { skills: Skill[] };

export async function readSkillsFile(): Promise<SkillsFile> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf-8");
    const parsed = JSON.parse(raw) as SkillsFile;
    return { skills: Array.isArray(parsed.skills) ? parsed.skills : [] };
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      const empty: SkillsFile = { skills: [] };
      await writeSkillsFile(empty);
      return empty;
    }
    throw err;
  }
}

export async function writeSkillsFile(data: SkillsFile): Promise<void> {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2) + "\n", "utf-8");
}
