# Second Brain AI

**Think. Capture. Act.** · *A calmer mind & brighter tomorrow.*

A calm productivity workspace matching the botanical mockups: Thinking space (rule-based AI over local data), Notes, Tasks, Meetings / MOM, Thoughts, Memories, and Profile.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- **Local JSON persistence** at `data/store.json` (no paid APIs / no cloud DB)
- Thinking-space assistant: rule-based by default; optional LLM (OpenAI, Gemini, Claude, OpenRouter, Ollama)
- **TipTap** rich-text notes (HTML persisted, sanitized on save/render)

## Quick start

```bash
cd /workspace/second-brain-ai
npm install
npm run dev
```

Open **http://localhost:3000** (redirects to `/thinking-space`).

Production build:

```bash
npm run build
npm start
```

## Demo walkthrough

1. **Thinking space** — Ask `List my notes`. You should see *Database backup* and *Server renewal* (seed data). Use **Listen** / **Copy** on AI cards. Glance counts update on the right.
2. **Meetings / MOM** — Open **Product planning** (12 October 2026 · Alex, Maya, Jordan). Check Agenda / Minutes / Decisions, linked **Release notes**, and action items (*Review voice flow* done, *Update documentation* open). Try **+ Add meeting**, **+ Add note**, **+ Add task**.
3. **Notes / Tasks / Thoughts / Memories** — Full CRUD. Linked notes and action items embed on meeting & thought detail.
4. **Secrets** — Reveal/copy the Demo API key (encrypted at rest).
5. **Profile** — Preferences, optional Thinking-space LLM, vault master-key status.

## Seed data

Stored in `data/store.json`:

| Entity | Samples |
|--------|---------|
| Notes | Database backup, Server renewal, Release notes |
| Tasks | Review voice flow (done), Update documentation, Prepare weekly agenda |
| Meetings | Product planning (12 Oct 2026), Weekly review (5 Oct 2026) |
| Thoughts | Voice-first capture, Calmer mornings |
| Memories | 5 archive entries |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve production build |
| `npm test` | Run unit checks (AI rules, crypto, LLM helpers) |

## Project layout

```
src/
  app/                  # App Router pages + API routes
    thinking-space/
    notes/ tasks/ meetings/ thoughts/ memories/ profile/
    api/                # REST over JSON store
  components/           # Sidebar, AppShell, ActionItems, …
  lib/                  # types, store, ai, format
data/store.json         # Local persistence + seed
data/projects.json      # Projects / products
data/clients.json, data/recurrings.json       # Clients, subscriptions, payments
data/assets.json        # Asset inventory
data/secrets.json       # Encrypted secrets vault
data/.secrets-master-key  # Auto key (gitignored)
data/llm-settings.json   # Optional LLM provider settings (encrypted key)
mock-*.jpg              # Design mockups (do not delete)
```

## Notes

- Persistence is file-based; concurrent writes from many users are not the goal — this is a personal workspace demo.
- Speech synthesis (Listen / read aloud) uses the browser `speechSynthesis` API when available.

## Secret manager

Encrypted vault for API keys, passwords, and tokens (separate from Notes).

### Encryption

- **AES-256-GCM** via Node `crypto`
- Ciphertext stored in `data/secrets.json` as `iv.tag.ciphertext` (base64 segments)
- Master key resolution order:
  1. Env var `SECRETS_MASTER_KEY` (preferred) — 64 hex characters (32 bytes) **or** any passphrase
  2. Else `data/.secrets-master-key` (auto-generated, **gitignored**, mode `0600`)

### Generate a master key

```bash
# 32-byte hex key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Then either:

```bash
export SECRETS_MASTER_KEY="<paste-64-hex-here>"
# or put it in .env.local (also gitignored)
echo 'SECRETS_MASTER_KEY=<paste-64-hex-here>' >> .env.local
```

If unset, the app creates `data/.secrets-master-key` on first use. **Back up that file** — losing it makes existing secrets unreadable.

### API shape

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/api/secrets` | List metadata only (no values / no ciphertext) |
| `POST` | `/api/secrets` | Create — body `{ name, value, category?, tags?, notes? }` |
| `GET` | `/api/secrets/:id` | Metadata only |
| `PUT` | `/api/secrets/:id` | Update metadata; optional new `value` |
| `DELETE` | `/api/secrets/:id` | Delete |
| `POST` | `/api/secrets/:id/reveal` | **Only** endpoint that returns plaintext |
| `GET` | `/api/secrets/status` | Master key source (`env` / `local-file` / `generated`) |

Plaintext values are never logged and never included in list responses.

## Asset management

Track hardware, software licenses, documents, and media.

- UI: `/assets` — list, detail, filters (type / status / search), CRUD
- API: `GET/POST /api/assets`, `GET/PUT/DELETE /api/assets/:id`
- Query params on list: `type`, `status`, `q`
- Data: `data/assets.json`

## Projects / Products

Track builds separately from shipped products.

- UI: `/projects` — **In progress** and **Live / Released** sections, with mark-live / move-to-in-progress
- Status model: `in_progress` | `live` (released)
- API: `GET/POST /api/projects`, `GET/PUT/DELETE /api/projects/:id` (`?status=&q=` on list)
- Data: `data/projects.json`
- Thinking space: “List my projects” + glance count

## Clients / Subscriptions

Manage customers of **live** products: subscriptions, renewals, payments.

- UI: `/clients`, `/recurrings` — clients CRUD, upcoming renewals (30d + overdue), subscriptions & payments, mark renewed
- Data: `data/clients.json, data/recurrings.json` (`clients`, `subscriptions`, `payments`)
- API:
  - `GET/POST /api/clients, /api/recurrings`, `GET/PUT/DELETE /api/clients/:id`
  - `GET/POST /api/subscriptions`, `GET/PUT/DELETE /api/subscriptions/:id` (`PUT` with `{ action: "renew" }` bumps renewal + records payment)
  - `GET/POST /api/payments`, `PUT/DELETE /api/payments/:id`
- Thinking space: “List my clients”, “Upcoming renewals”

## Recurrings (My Subscriptions)

Personal subscriptions and recurring expenses (Netflix, domains, SaaS tools) — separate from **Clients → Subscriptions** (customer billing).

- Page: `/recurrings`
- API: `GET/POST /api/recurrings`, `GET/PUT/DELETE /api/recurrings/[id]`, `PUT` with `{ "action": "mark_paid" }` bumps `nextDueDate` by billing period
- Persist: `data/recurrings.json`
- Thinking space: “List my recurrings”, “Upcoming dues”

## Finance

Track monthly income, expenses, lends (money you lent), and dues (money you owe).

- Page: `/finance` — month selector, totals, outstanding lends/dues, CRUD
- API: `GET/POST /api/finance`, `GET/PUT/DELETE /api/finance/[id]`
  - `PUT` `{ "action": "settle" }` — mark lend/due fully settled
  - `PUT` `{ "action": "repay", "amount": N }` — partial repayment
  - `GET ?summary=1&month=YYYY-MM` — month summary + filtered list
- Persist: `data/finance.json`
- Thinking space: “Finance summary”, “Outstanding lends”, “Outstanding dues”

## Belongings

Personal items and **where they are kept** — distinct from Assets (inventory/value).

- Page: `/belongings` — filter by location/category/status, group by place, CRUD
- API: `GET/POST /api/belongings`, `GET/PUT/DELETE /api/belongings/[id]`
  - Filters: `?q=`, `?location=`, `?category=`, `?status=`
  - `?group=location` — also returns `byLocation` map
- Persist: `data/belongings.json`
- Status: `with_me` | `stored` | `lent_out` | `missing`
- Thinking space: “List my belongings”, “Where is my passport”

## Calendar & public booking

- Owner page: `/calendar` — month + agenda, availability, booking links
- Persist: `data/calendar.json` (events, weeklyAvailability, dateWindows, tempLinks, settings)
- APIs: `/api/calendar/events`, `/availability`, `/settings`, `/temp-links`
- **Permanent public link:** `/book/[slug]` (default slug `me`) — `GET/POST /api/book/[slug]`
- **Temporary link:** `/book/t/[token]` — expires or revoke; `GET/POST /api/book/t/[token]`
- Public APIs return open slots only (never private `notes`)
- Thinking space: “Upcoming appointments”

## Job Hunt

Track applications through interview rounds to offer/accept.

- Page: `/jobs` — board + list, status moves, TipTap JD, resume upload
- Statuses: applied, enquired, abandoned, scheduled, failed, first_round…fifth_round, job_offer, accepted, rejected
- API: `GET/POST /api/jobs`, `GET/PUT/DELETE /api/jobs/[id]`
- Resume: `POST/GET/DELETE /api/jobs/[id]/resume` → files in `data/uploads/resumes/`
- Optional link interview → Calendar event (`linkToCalendar: true`)
- Persist: `data/jobs.json`
- Thinking space: “Job applications”

## Skills

Track skills you have vs skills to learn.

- Page: `/skills` — two lists (Have / To learn), move between them
- Status: `have` | `learning` | `planned`
- Proficiency (have/learning): beginner → expert; priority 1–5 for to-learn
- API: `GET/POST /api/skills`, `GET/PUT/DELETE /api/skills/[id]` (+ `mark_have` / `mark_learn` actions)
- Persist: `data/skills.json`
- Thinking space: “List my skills”

## Library

Save links, screenshots, PDFs, and documents to study later.

- Page: `/library` — CRUD, tags, type filter, preview/download
- Files: `data/uploads/library/` via `POST/GET/DELETE /api/library/[id]/file`
- Persist: `data/library.json` · `/api/library`
- Thinking space: “List my library”

## Thinking space AI

**Default:** rule-based assistant covering all modules (notes, tasks, meetings, thoughts, memories, secrets metadata only, assets, projects, clients/subscriptions/renewals, recurrings, finance, belongings, calendar, jobs, skills, library). List / summary / upcoming intents, keyword search, and at-a-glance counts. Never returns secret values.

**Optional LLM:** enable in **Profile → Thinking space LLM** (or via env). When on, chat sends the user message plus a compact workspace context (names/titles/counts — **never secret values**) to the chosen provider. On missing key, provider error, or empty reply, the app falls back to the rule-based engine. API keys are AES-256-GCM encrypted with the same vault master key as Secrets and are never logged or returned by the settings API.

### LLM environment variables

| Variable | Purpose |
|----------|---------|
| `LLM_ENABLED` | `true` / `1` forces LLM on (still needs a key except Ollama) |
| `LLM_PROVIDER` | `openai` \| `gemini` \| `claude` \| `openrouter` \| `ollama` |
| `LLM_MODEL` | Override model id (else Profile setting / provider default) |
| `LLM_BASE_URL` | Override base URL (useful for Ollama / OpenRouter / proxies) |
| `LLM_API_KEY` | Generic key used when provider-specific env is unset |
| `OPENAI_API_KEY` | OpenAI |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Google Gemini |
| `ANTHROPIC_API_KEY` / `CLAUDE_API_KEY` | Anthropic Claude |
| `OPENROUTER_API_KEY` | OpenRouter |
| `OLLAMA_API_KEY` | Rarely needed for local Ollama |
| `SECRETS_MASTER_KEY` | Same master key encrypts stored LLM keys (see Secret manager) |

Example `.env.local`:

```bash
LLM_ENABLED=false
LLM_PROVIDER=openai
LLM_MODEL=gpt-4o-mini
# OPENAI_API_KEY=sk-...
# LLM_BASE_URL=http://127.0.0.1:11434   # Ollama
# OPENROUTER_API_KEY=...
```

Settings persist in `data/llm-settings.json` (`apiKeyCiphertext` only — never plaintext). UI: `/profile`. API: `GET/PUT /api/llm/settings` (public fields only; PUT may send `apiKey` once to encrypt, or `clearApiKey: true`).

