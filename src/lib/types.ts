export interface Note {
  id: string;
  title: string;
  content: string;
  linkedMeetingIds: string[];
  linkedThoughtIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  title: string;
  done: boolean;
  meetingId?: string | null;
  thoughtId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  agenda: string;
  minutes: string;
  decisions: string;
  linkedNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Thought {
  id: string;
  title: string;
  content: string;
  linkedNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  name: string;
  language: string;
  voice: string;
  readAloud: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  html?: string;
  createdAt: string;
}

export interface StoreData {
  notes: Note[];
  tasks: Task[];
  meetings: Meeting[];
  thoughts: Thought[];
  memories: Memory[];
  profile: Profile;
  chatHistory: ChatMessage[];
}

/** Stored secret — valueCiphertext is AES-256-GCM; never put plaintext here. */
export interface SecretRecord {
  id: string;
  name: string;
  category: string;
  tags: string[];
  notes: string;
  valueCiphertext: string;
  valueFingerprint: string;
  createdAt: string;
  updatedAt: string;
}

/** Public list/detail shape — no ciphertext, no plaintext. */
export interface SecretPublic {
  id: string;
  name: string;
  category: string;
  tags: string[];
  notes: string;
  hasValue: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AssetType = "Hardware" | "Software" | "Document" | "Media" | "Other";
export type AssetStatus = "Active" | "In repair" | "Retired" | "Lost";

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  status: AssetStatus;
  serial: string;
  purchaseDate: string;
  value: number | null;
  location: string;
  owner: string;
  tags: string[];
  notes: string;
  relatedSecretIds: string[];
  relatedNoteIds: string[];
  createdAt: string;
  updatedAt: string;
}
