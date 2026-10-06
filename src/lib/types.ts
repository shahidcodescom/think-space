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

export type BelongingStatus = "with_me" | "stored" | "lent_out" | "missing";

export interface Belonging {
  id: string;
  name: string;
  category: string;
  /** Room / place / container — where it is kept. */
  location: string;
  /** Optional photo URL. */
  photoUrl: string;
  /** Short visual note if no photo. */
  photoNote: string;
  tags: string[];
  quantity: number;
  status: BelongingStatus;
  notes: string;
  linkedAssetId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type CalendarEventType =
  | "appointment"
  | "interview"
  | "meeting"
  | "other";
export type CalendarEventStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed";

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  start: string;
  end: string;
  location: string;
  url: string;
  /** Private — never returned by public booking APIs. */
  notes: string;
  status: CalendarEventStatus;
  bookingSource: "owner" | "public_permanent" | "public_temp" | null;
  bookerName: string;
  bookerEmail: string;
  createdAt: string;
  updatedAt: string;
}

/** Public-safe event projection (no notes). */
export type CalendarEventPublic = Omit<CalendarEvent, "notes">;

export interface WeeklyAvailabilitySlot {
  id: string;
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface DateAvailabilityWindow {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingSettings {
  permanentSlug: string;
  permanentEnabled: boolean;
  slotMinutes: number;
  ownerDisplayName: string;
  timezone: string;
}

export interface TempBookingLink {
  id: string;
  token: string;
  label: string;
  expiresAt: string;
  revoked: boolean;
  /** Allowed dates (YYYY-MM-DD). Empty = any day with availability in range. */
  dates: string[];
  createdAt: string;
}

export interface CalendarFile {
  settings: BookingSettings;
  events: CalendarEvent[];
  weeklyAvailability: WeeklyAvailabilitySlot[];
  dateWindows: DateAvailabilityWindow[];
  tempLinks: TempBookingLink[];
}

export interface PublicSlot {
  start: string;
  end: string;
}

export type JobStatus =
  | "applied"
  | "enquired"
  | "abandoned"
  | "scheduled"
  | "failed"
  | "first_round"
  | "second_round"
  | "third_round"
  | "fourth_round"
  | "fifth_round"
  | "job_offer"
  | "accepted"
  | "rejected";

export const JOB_STATUSES: JobStatus[] = [
  "applied",
  "enquired",
  "abandoned",
  "scheduled",
  "failed",
  "first_round",
  "second_round",
  "third_round",
  "fourth_round",
  "fifth_round",
  "job_offer",
  "accepted",
  "rejected",
];

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  location: string;
  remote: boolean;
  sourceUrl: string;
  /** Job description HTML (TipTap). */
  jdHtml: string;
  status: JobStatus;
  appliedDate: string;
  nextInterviewAt: string;
  salaryNotes: string;
  contacts: string;
  notes: string;
  /** Relative path under project, e.g. data/uploads/resumes/…. */
  resumePath: string | null;
  resumeName: string | null;
  linkedCalendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SkillStatus = "have" | "learning" | "planned";
export type SkillProficiency =
  | "beginner"
  | "intermediate"
  | "advanced"
  | "expert";

export interface Skill {
  id: string;
  name: string;
  category: string;
  status: SkillStatus;
  /** Meaningful when status is have (or learning). */
  proficiency: SkillProficiency | null;
  /** 1 (high) … 5 (low) for learning/planned. */
  priority: number | null;
  notes: string;
  targetDate: string;
  createdAt: string;
  updatedAt: string;
}

