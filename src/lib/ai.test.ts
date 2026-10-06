import { answerQuery, renderAnswerMarkdown } from "./ai";
import { Asset, Client, Project, SecretPublic, StoreData, Subscription } from "./types";

const sample: StoreData = {
  notes: [
    {
      id: "note-1",
      title: "Database backup",
      content: "<p>Take a snapshot <strong>every 5 days</strong>.</p>",
      linkedMeetingIds: [],
      linkedThoughtIds: [],
      createdAt: "2026-09-20T10:00:00.000Z",
      updatedAt: "2026-09-20T10:00:00.000Z",
    },
  ],
  tasks: [
    {
      id: "task-1",
      title: "Review voice flow",
      done: true,
      meetingId: "meeting-1",
      thoughtId: null,
      createdAt: "2026-10-02T10:00:00.000Z",
      updatedAt: "2026-10-05T10:00:00.000Z",
    },
  ],
  meetings: [
    {
      id: "meeting-1",
      title: "Product planning",
      date: "2026-10-12",
      participants: ["Alex", "Maya", "Jordan"],
      agenda: "Plan the next release.",
      minutes: "Reviewed feedback and agreed on priorities.",
      decisions: "Ship the voice workflow first.",
      linkedNoteIds: [],
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-01T10:00:00.000Z",
    },
  ],
  thoughts: [],
  memories: [],
  profile: {
    name: "Test User",
    language: "English (India)",
    voice: "Default voice",
    readAloud: true,
  },
  chatHistory: [],
};

const assets: Asset[] = [
  {
    id: "asset-1",
    name: "Framework Laptop 13",
    type: "Hardware",
    status: "Active",
    serial: "FW-13-2026-A4F2",
    purchaseDate: "2026-03-12",
    value: 1299,
    location: "Home desk",
    owner: "Test User",
    tags: ["laptop"],
    notes: "Primary machine",
    relatedSecretIds: [],
    relatedNoteIds: [],
    createdAt: "2026-03-12T10:00:00.000Z",
    updatedAt: "2026-03-12T10:00:00.000Z",
  },
];

const PLAINTEXT_VALUE = "sb_demo_sk_live_SHOULD_NEVER_APPEAR";
const secrets: SecretPublic[] = [
  {
    id: "secret-1",
    name: "Demo API key",
    category: "API Keys",
    tags: ["demo", "api"],
    notes: "Sample key for demos",
    hasValue: true,
    createdAt: "2026-10-01T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
];


const projects: Project[] = [
  {
    id: "project-1",
    name: "Second Brain AI",
    description: "Calm workspace app",
    status: "in_progress",
    url: "http://localhost:3000",
    tags: ["product"],
    startedAt: "2026-09-01",
    releasedAt: "",
    notes: "Shipping vault",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: "project-2",
    name: "RuneRail",
    description: "Live creative routing product",
    status: "live",
    url: "https://runerail.example",
    tags: ["saas", "live"],
    startedAt: "2025-04-10",
    releasedAt: "2026-02-18",
    notes: "Launched",
    createdAt: "2025-04-10T10:00:00.000Z",
    updatedAt: "2026-02-18T10:00:00.000Z",
  },
];


const billingClients: Client[] = [
  {
    id: "client-1",
    name: "Aisha Rahman",
    email: "aisha@northwind.dev",
    company: "Northwind Labs",
    notes: "Yearly",
    createdAt: "2026-02-20T10:00:00.000Z",
    updatedAt: "2026-02-20T10:00:00.000Z",
  },
];

const billingSubs: Subscription[] = [
  {
    id: "sub-1",
    clientId: "client-1",
    projectId: "project-2",
    plan: "RuneRail Pro",
    status: "active",
    startDate: "2026-02-18",
    renewalDate: "2026-10-20",
    amount: 960,
    currency: "USD",
    billingPeriod: "yearly",
    notes: "",
    createdAt: "2026-02-18T10:00:00.000Z",
    updatedAt: "2026-02-18T10:00:00.000Z",
  },
];


const recurrings = [
  {
    id: "rec-1",
    name: "Netflix",
    category: "Media",
    amount: 649,
    currency: "INR",
    billingPeriod: "monthly",
    nextDueDate: "2026-10-18",
    status: "active",
    paymentMethod: "UPI",
    url: "https://www.netflix.com",
    notes: "",
    linkedSecretId: null,
    linkedProjectId: null,
    createdAt: "2025-06-01T10:00:00.000Z",
    updatedAt: "2026-09-18T10:00:00.000Z",
  },
  {
    id: "rec-2",
    name: "secondbrain.ai domain",
    category: "Domain",
    amount: 14,
    currency: "USD",
    billingPeriod: "yearly",
    nextDueDate: "2026-10-02",
    status: "active",
    paymentMethod: "Card",
    url: "",
    notes: "overdue",
    linkedSecretId: null,
    linkedProjectId: null,
    createdAt: "2025-10-02T10:00:00.000Z",
    updatedAt: "2025-10-02T10:00:00.000Z",
  },
];


const financeTx = [
  {
    id: "fin-1",
    type: "income",
    amount: 120000,
    currency: "INR",
    date: "2026-10-01",
    category: "Salary",
    counterparty: "Acme",
    status: null,
    amountSettled: 0,
    notes: "",
    linkedRecurringId: null,
    createdAt: "2026-10-01T09:00:00.000Z",
    updatedAt: "2026-10-01T09:00:00.000Z",
  },
  {
    id: "fin-2",
    type: "expense",
    amount: 4200,
    currency: "INR",
    date: "2026-10-03",
    category: "Groceries",
    counterparty: "",
    status: null,
    amountSettled: 0,
    notes: "",
    linkedRecurringId: null,
    createdAt: "2026-10-03T18:00:00.000Z",
    updatedAt: "2026-10-03T18:00:00.000Z",
  },
  {
    id: "fin-3",
    type: "lend",
    amount: 5000,
    currency: "INR",
    date: "2026-10-02",
    category: "Personal",
    counterparty: "Rahul",
    status: "open",
    amountSettled: 0,
    notes: "",
    linkedRecurringId: null,
    createdAt: "2026-10-02T14:00:00.000Z",
    updatedAt: "2026-10-02T14:00:00.000Z",
  },
  {
    id: "fin-4",
    type: "due",
    amount: 15000,
    currency: "INR",
    date: "2026-09-15",
    category: "Rent",
    counterparty: "Landlord",
    status: "partial",
    amountSettled: 5000,
    notes: "",
    linkedRecurringId: null,
    createdAt: "2026-09-15T10:00:00.000Z",
    updatedAt: "2026-10-01T10:00:00.000Z",
  },
];

const extras = { assets, secrets, projects, clients: billingClients, subscriptions: billingSubs, recurrings, finance: financeTx };

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function assertNoSecretLeak(text: string, label: string) {
  assert(!text.includes(PLAINTEXT_VALUE), `${label}: plaintext leaked`);
  assert(!text.includes("valueCiphertext"), `${label}: ciphertext field leaked`);
  assert(!/sk_live_SHOULD/.test(text), `${label}: secret fragment leaked`);
}

const notes = answerQuery("List my notes", sample, extras);
assert(notes.title === "Your active notes", "expected notes title");
assert(notes.text.includes("Database backup"), "expected note title in answer");
assert(notes.text.includes("every 5 days"), "expected plain snippet without HTML tags");
assert(!notes.text.includes("<strong>"), "HTML should be stripped in chat");

const meetings = answerQuery("show my meetings", sample, extras);
assert(meetings.text.includes("Product planning"), "expected meeting in answer");

const assetsAns = answerQuery("List my assets", sample, extras);
assert(assetsAns.title === "Your assets", "assets title");
assert(assetsAns.text.includes("Framework Laptop 13"), "asset name");
assert(assetsAns.text.includes("FW-13-2026-A4F2"), "asset serial");

const secretsAns = answerQuery("List my secrets", sample, extras);
assert(secretsAns.title === "Your secrets", "secrets title");
assert(secretsAns.text.includes("Demo API key"), "secret name");
assert(secretsAns.text.includes("API Keys"), "secret category");
assert(secretsAns.text.includes("/secrets?id=secret-1"), "secret redirect link");
assertNoSecretLeak(secretsAns.text, "list secrets");

const showSecrets = answerQuery("show my secrets", sample, extras);
assert(showSecrets.text.includes("Demo API key"), "show secrets name");
assert(showSecrets.text.includes("[Open in Secrets](/secrets?id=secret-1)"), "show secrets link");
assertNoSecretLeak(showSecrets.text, "show secrets");

const glance = answerQuery("at a glance", sample, extras);
assert(glance.text.includes("Notes:** 1"), "expected note count");
assert(glance.text.includes("Assets:** 1"), "expected asset count");
assert(glance.text.includes("Secrets:** 1"), "expected secret count");
assertNoSecretLeak(glance.text, "glance");

const help = answerQuery("help", sample, extras);
assert(help.text.toLowerCase().includes("assets"), "help mentions assets");
assert(help.text.toLowerCase().includes("secrets"), "help mentions secrets");

const assetHit = answerQuery("home desk", sample, extras);
assert(assetHit.text.includes("Framework Laptop"), "keyword asset hit");

const secretHit = answerQuery("demo api", sample, extras);
assert(secretHit.text.includes("Demo API key"), "keyword secret hit");
assert(secretHit.text.includes("/secrets?id=secret-1"), "keyword secret redirect");
assertNoSecretLeak(secretHit.text, "keyword secret");

const html = renderAnswerMarkdown(secretsAns.title, secretsAns.text);
assert(html.includes('href="/secrets?id=secret-1"'), "rendered clickable secret link");
assertNoSecretLeak(html, "rendered html");

const projectsAns = answerQuery("List my projects", sample, extras);
assert(projectsAns.title === "Your projects", "projects title");
assert(projectsAns.text.includes("In progress"), "projects in progress section");
assert(projectsAns.text.includes("Live / Released"), "projects live section");
assert(projectsAns.text.includes("Second Brain AI"), "in-progress project");
assert(projectsAns.text.includes("RuneRail"), "live project");

assert(glance.text.includes("Projects:** 2"), "glance project count");
assert(help.text.toLowerCase().includes("projects"), "help mentions projects");

const projectHit = answerQuery("runerail", sample, extras);
assert(projectHit.text.toLowerCase().includes("runerail"), "keyword project hit");

const clientsAns = answerQuery("List my clients", sample, extras);
assert(clientsAns.title === "Your clients", "clients title");
assert(clientsAns.text.includes("Aisha Rahman"), "client name");

const renewalsAns = answerQuery("upcoming renewals", sample, extras);
assert(renewalsAns.title === "Upcoming renewals", "renewals title");
assert(renewalsAns.text.includes("Aisha"), "renewal client");
assert(renewalsAns.text.includes("RuneRail Pro"), "renewal plan");

assert(glance.text.includes("Clients:** 1"), "glance clients");
assert(help.text.toLowerCase().includes("clients"), "help clients");
assert(help.text.toLowerCase().includes("renewals"), "help renewals");


const recurringsAns = answerQuery("List my recurrings", sample, extras);
assert(recurringsAns.title === "Your recurrings", "recurrings title");
assert(recurringsAns.text.includes("Netflix"), "recurring name");
assert(recurringsAns.text.includes("secondbrain.ai domain"), "domain recurring");

const duesAns = answerQuery("upcoming dues", sample, extras);
assert(duesAns.title === "Upcoming dues", "dues title");
assert(duesAns.text.includes("Netflix") || duesAns.text.includes("domain"), "dues item");

assert(glance.text.includes("Recurrings:** 2"), "glance recurrings");
assert(help.text.toLowerCase().includes("recurrings") || help.text.toLowerCase().includes("dues"), "help recurrings");


const financeAns = answerQuery("Finance summary", sample, extras);
assert(financeAns.title === "Finance summary", "finance title");
assert(financeAns.text.includes("Income:** 120000"), "finance income");
assert(financeAns.text.includes("Expenses:** 4200"), "finance expenses");

const lendsAns = answerQuery("outstanding lends", sample, extras);
assert(lendsAns.title === "Open lends", "lends title");
assert(lendsAns.text.includes("Rahul"), "lend counterparty");

const duesAns2 = answerQuery("outstanding dues", sample, extras);
assert(duesAns2.title === "Open dues", "open dues title");
assert(duesAns2.text.includes("Landlord"), "due counterparty");

assert(glance.text.includes("Finance txns:** 4"), "glance finance");
assert(help.text.toLowerCase().includes("finance"), "help finance");

console.log("ai.test.ts: all assertions passed");


