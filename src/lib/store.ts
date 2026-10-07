import { getOrInitDoc, setDoc } from "./db-docs";
import { readLegacyJson } from "./json-import";
import { StoreData } from "./types";

const KEY = "store";

const EMPTY_STORE: StoreData = {
  notes: [],
  tasks: [],
  meetings: [],
  thoughts: [],
  memories: [],
  profile: {
    name: "",
    language: "English (India)",
    voice: "Default voice",
    readAloud: false,
  },
  chatHistory: [],
};

export async function readStore(): Promise<StoreData> {
  return getOrInitDoc(KEY, async () => {
    const legacy = await readLegacyJson<StoreData>("store.json");
    return legacy ?? { ...EMPTY_STORE, profile: { ...EMPTY_STORE.profile } };
  });
}

export async function writeStore(data: StoreData): Promise<void> {
  await setDoc(KEY, data);
}

export function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export { EMPTY_STORE };
