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

export type ProjectStatus = "in_progress" | "live";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  url: string;
  tags: string[];
  startedAt: string;
  releasedAt: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type SubscriptionStatus = "active" | "past_due" | "cancelled" | "trial";
export type BillingPeriod = "monthly" | "yearly" | "custom";
export type PaymentStatus = "paid" | "failed" | "pending" | "refunded";

export interface Client {
  id: string;
  name: string;
  email: string;
  company: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Subscription {
  id: string;
  clientId: string;
  projectId: string;
  plan: string;
  status: SubscriptionStatus;
  startDate: string;
  renewalDate: string;
  amount: number;
  currency: string;
  billingPeriod: BillingPeriod;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  clientId: string;
  subscriptionId: string | null;
  amount: number;
  currency: string;
  date: string;
  method: string;
  status: PaymentStatus;
  reference: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type RecurringCategory =
  | "Software"
  | "Media"
  | "Domain"
  | "Utilities"
  | "Other";
export type RecurringPeriod = "weekly" | "monthly" | "yearly" | "custom";
export type RecurringStatus = "active" | "paused" | "cancelled";

export interface Recurring {
  id: string;
  name: string;
  category: RecurringCategory;
  amount: number;
  currency: string;
  billingPeriod: RecurringPeriod;
  nextDueDate: string;
  status: RecurringStatus;
  paymentMethod: string;
  url: string;
  notes: string;
  linkedSecretId: string | null;
  linkedProjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type FinanceTxType = "income" | "expense" | "lend" | "due";
export type FinanceSettleStatus = "open" | "partial" | "settled";

export interface FinanceTransaction {
  id: string;
  type: FinanceTxType;
  amount: number;
  currency: string;
  date: string;
  category: string;
  counterparty: string;
  /** Only meaningful for lend/due; null for income/expense. */
  status: FinanceSettleStatus | null;
  /** Cumulative repayments against lend/due. */
  amountSettled: number;
  notes: string;
  linkedRecurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

