import { Skill } from "./types";
import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";

const KEY = "skills";

export type SkillsFile = { skills: Skill[] };

export async function readSkillsFile(): Promise<SkillsFile> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<SkillsFile>("skills.json");
    return { skills: Array.isArray(legacy?.skills) ? legacy!.skills : [] };
  });
}

export async function writeSkillsFile(data: SkillsFile): Promise<void> {
  await setDoc(KEY, data);
}
