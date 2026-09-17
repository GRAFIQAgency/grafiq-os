# GRAFIQ OS

Internal operating system for the GRAFIQ creative & digital agency. One modular
web app that grows module by module: Dashboard, Projects, Pricing, Capacity,
Talent, Sales, Finance, QA and Settings.

**Current state:** foundation (app shell, auth, navigation, EN/CS) and the
Pricing, Settings, Sourcing, Talent, Projects, Sales, Capacity, QA and Finance
modules, with the **Dashboard** aggregating all of them into one command centre.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, TypeScript, `src/` layout) |
| Styling | Tailwind CSS 4 + shadcn/ui (Radix, "nova" preset, neutral palette) |
| Data & auth | Supabase (Postgres + Supabase Auth via `@supabase/ssr`) |
| Icons | lucide-react |

## 1. Running the project

Requirements: Node 20+ and npm.

```bash
npm install
cp .env.example .env.local   # then fill in the Supabase values (see below)
npm run dev
```

Open http://localhost:3000. You will be redirected to `/login`.

Other scripts:

```bash
npm run build   # production build (also type-checks)
npm run start   # serve the production build
npm run lint    # ESLint
npm test        # Vitest unit tests (business logic)
```

## 2. Configuring Supabase

1. Create a project at https://supabase.com/dashboard.
2. In **Project Settings → API** copy the **Project URL** and the
   **publishable key** (older projects show an **anon** key; both work).
3. Put them in `.env.local`:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

4. Run the migrations in `supabase/migrations/` **in order** in the
   **SQL Editor** (or `supabase db push` if you use the Supabase CLI):
   - `0001_profiles.sql` — `profiles` table, auto-create trigger, RLS.
   - `0002_pricing.sql` — `pricing_estimates` + `pricing_cost_items` for the Pricing module.
   - `0003_business_settings.sql` — `business_settings` + `role_costs` for Settings → Business.
   - `0004_sourcing.sql` — Sourcing module tables (talent, companies, signals, searches, sources, evaluations, notes, activity).
   - `0005_sourcing_talent_sources.sql` — registers the GitHub, manual and inbound-application connectors.
   - `0006_sourcing_clipper.sql` — registers the browser clipper connector.
   - `0007_talent_bench.sql` — `talent_bench_details` (1:1 operational fields for the Talent Bench).
   - `0008_projects.sql` — Projects: projects, members, milestones, tasks, links, direct costs, change requests.
   - `0009_sales.sql` — Sales: CRM pipeline stages on `company_leads` + `company_crm_details` (1:1 deal fields).
   - `0010_pay_models.sql` — Pay models: `percent` cost lines in Pricing/Projects, per-person pay model on the Talent Bench.
   - `0011_capacity.sql` — Capacity: `profile_capacity_details` (monthly capacity of internal users). Everything else in Capacity is derived.
   - `0012_member_pay_models_and_proposals.sql` — per-project pay model on `project_members` + `pricing_proposals` (client-facing pricing plans shared by link).
   - `0013_unit_pricing.sql` — per-unit pricing: `unit` cost lines and per-unit client price in Pricing, unit pay for people and project members, unit baseline on projects.
   - `0014_shared_proposals.sql` — `get_shared_proposal(token)` function so public pricing-plan links work without the service-role key.
   - `0015_qa.sql` — QA: `qa_templates` + `qa_template_items` (reusable checklists, 5 built-in GRAFIQ templates seeded), `qa_checklists` + `qa_checklist_items` (frozen per-project copies with results, fix-task links, approval).
   - `0016_finance.sql` — Finance: `finance_accounts` (manual cash balances), `finance_receivables`, `finance_payables`, `finance_recurring_costs`, `finance_cash_events` (ledger of actual money movements, currency-checked by trigger).
   - `0017_pending_actions.sql` — Hermes approval queue: `pending_actions` (proposals from the MCP endpoint; nothing is applied until a human approves it on `/admin/pending`).
5. Create users. This is an internal tool with **no public signup**: add team
   members in **Authentication → Users → Add user** (set a password, or send an
   invite). Optionally give them a `full_name` in the user metadata; it becomes
   the profile's display name.
6. In **Authentication → Providers → Email**, you may disable "Allow new users
   to sign up" so only admin-created accounts exist.

## 3. Project structure

```
src/
  app/                    Next.js routes only — thin pages that compose module components
    layout.tsx            Root layout: fonts, dark theme, global providers
    page.tsx              "/" → redirects to /dashboard
    (auth)/login/         Public login page
    (app)/                Authenticated area (layout checks the session, renders the shell)
      dashboard/ projects/ pricing/ capacity/ talent/ sales/ finance/ qa/ admin/pending/ settings/
    api/mcp/              MCP endpoint for the Hermes operator agent (bearer token)
  proxy.ts                Next.js proxy (middleware): refreshes session, guards routes
  components/
    ui/                   shadcn/ui primitives (generated; safe to re-add/update via CLI)
    layout/               App shell: sidebar, top bar, user menu, mobile nav
    shared/               Small reusable pieces: page header, placeholder badge, empty panel…
  config/
    modules.ts            Module registry — single source of truth for nav + titles
    site.ts               App name and default routes
    env.ts                Environment variable access
  lib/
    i18n/                 EN/CS dictionaries, locale cookie, server + client helpers
    supabase/             Supabase client factories (browser, server, proxy)
    utils.ts              `cn()` helper
  modules/                Feature modules (see below)
    auth/                 Login/logout actions, current-user queries, login form
    dashboard/            Company command centre: aggregates every module's read API (attention feed, timeline, health, snapshots)
    pricing/              Pricing / profit calculator (first real module, see its README)
    settings/             Business settings: company, margins, payment terms, role costs
    sourcing/             Talent & lead discovery engine (see docs/SOURCING.md)
    talent/               Talent Bench: operational view of people saved from Sourcing
    projects/             Projects: delivery centre with baseline/forecast economics and health
    sales/                Sales: CRM pipeline over the shared company record (deals, contacts, customers)
    capacity/             Capacity: derived planning layer over Talent + Projects (utilization, matrix, what-if)
    qa/                   QA: delivery quality control — templates, frozen project checklists, fix tasks, approval, completion gate
    guide/                Interactive tutorial: /guide page, "?" help panel, cross-page tour (must stay 1:1 with the product)
    hermes/               Hermes MCP endpoint: read tools, proposals, approval queue (see its README)
    finance/              Finance: management cash flow — accounts, receivables, payables, recurring costs, forecast, risks, profitability (from Projects)
  types/
    database.ts           Database row types (hand-written for now)
supabase/
  migrations/             SQL migrations, applied manually or via Supabase CLI
extension/                GRAFIQ Clipper browser extension (see extension/README.md)
docs/
  ARCHITECTURE.md         How the app is organised and how to extend it
```

## 4. Adding a new module

Short version (full details in `docs/ARCHITECTURE.md`):

1. **Register it** in `src/config/modules.ts` (id, title, href, icon, description).
   It appears in the sidebar and gets a page title automatically.
2. **Create the module folder** `src/modules/<name>/` with only what you need:
   `components/`, `types.ts`, `services.ts` (business logic), `queries.ts`
   (reads), `actions.ts` (writes, `"use server"`), `validation.ts`.
3. **Add the route** `src/app/(app)/<name>/page.tsx` and make it compose
   components from the module folder. Keep pages thin.
4. **Add the schema** as a new file in `supabase/migrations/` and extend
   `src/types/database.ts` (or switch to generated types).

## 5. Architectural decisions

- **Modules own their logic; routes only compose.** `src/app` stays thin so
  features can be found, tested and changed in one place.
- **Module registry drives navigation.** One list in `src/config/modules.ts`
  feeds the sidebar, top-bar title and placeholder pages. No duplicated nav data.
- **Server-first data access.** Server Components and Server Actions talk to
  Supabase through `src/lib/supabase/server.ts`. The browser client exists for
  the rare client-side need (realtime, uploads).
- **Auth in two layers.** `src/proxy.ts` redirects unauthenticated requests early;
  the `(app)` layout re-verifies with `requireUser()` so pages never render
  without a user. Row Level Security protects data at the database.
- **No public signup.** Users are created by an admin in the Supabase dashboard.
- **Dark theme by default**, with light tokens kept in `globals.css` so a toggle
  can be added later.
- **Bilingual UI (EN/CS) without a library.** Typed dictionaries in
  `src/lib/i18n`, locale stored in a cookie, switcher in the top bar.
- **Minimal dependencies.** No form library, no validation library, no state
  manager. Add them when a module genuinely needs them.
- **Business logic is pure and tested.** Calculations live in plain functions
  (e.g. `modules/pricing/calculations.ts`) with Vitest tests, never in components.

## 6. Hermes MCP endpoint (`/api/mcp`)

An MCP server that lets the operator agent (Hermes, running in the cloud)
**read** GRAFIQ OS and **propose** changes. It can never change anything by
itself: a proposal is a row in `pending_actions` that a signed-in person
approves or rejects at `/admin/pending`.

### Environment

| Variable | Required | What it is for |
| --- | --- | --- |
| `HERMES_API_TOKEN` | yes | The only credential. Sent as `Authorization: Bearer <token>`; compared in constant time. Shorter than 24 characters counts as unset and every request is refused. Generate with `openssl rand -base64 48`. |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | Hermes has no user account, so RLS cannot scope it. Reads run with the service role and are limited by the endpoint's fixed queries instead. |

Set both in `.env.local` locally and in the Vercel project for the deployment.
Run migration `0017_pending_actions.sql` before using the write tools.

### Guardrails

- One static bearer token; anything else gets `401` with a `WWW-Authenticate`
  header. No token configured also means `401` — it fails closed.
- 60 requests per minute per token (in memory, per server instance) → `429`
  with `Retry-After`.
- No SQL, table name, column or filter expression can be sent from outside.
  Every tool is a fixed query with an explicit column list, zod-validated
  arguments and a capped limit (max 100 rows, paged).
- The endpoint never returns environment values, keys, e-mail addresses or
  phone numbers. Talent is reported as name, role, rate and availability only.
- Write tools only ever insert into `pending_actions`. Approval on
  `/admin/pending` runs the same Server Action the UI runs, as the signed-in
  user, so the same validation, the QA completion gate and the activity log all
  apply.

### Tools

Reads: `projects_overview`, `project_detail`, `deadlines_due`,
`sales_pipeline`, `finance_overview`, `capacity_snapshot`, `qa_blockers`,
`talent_available`.

Proposals (queue only): `project_status_set`, `deal_stage_set`,
`receivable_mark_paid`, `task_create`, `client_note_add`, plus `pending_list`
to see what is waiting and what was decided.

Money always travels with its currency and currencies are never added
together; project margins are economics excluding VAT, while `finance_overview`
is cash timing including VAT — the two are never mixed.

### Testing it with curl

No token, or a wrong one → `401`:

```bash
curl -i -X POST http://localhost:3000/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

List the tools (needs `Accept` for both content types):

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $HERMES_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Call a read tool:

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $HERMES_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call",
       "params":{"name":"projects_overview","arguments":{"limit":5}}}'
```

Propose a change (this only queues it):

```bash
curl -s -X POST http://localhost:3000/api/mcp \
  -H "Authorization: Bearer $HERMES_API_TOKEN" \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call",
       "params":{"name":"client_note_add","arguments":{
         "companyId":"<company-uuid>","body":"Called, they want a quote.",
         "reason":"Recording what the client said on the phone"}}}'
```

Then open `/admin/pending` and approve or reject it.

## Install on a phone (PWA)

GRAFIQ OS is a Progressive Web App: `src/app/manifest.ts` (web manifest),
`public/sw.js` (service worker: static assets cache-first, pages network-first
with an `/offline` fallback), icons in `public/icons/` generated from
`public/brand/grafiq-mark.svg`. On iPhone open the site in Safari → Share →
Add to Home Screen. The service worker only registers in production builds.

## Documentation for future sessions

- `docs/ARCHITECTURE.md` — conventions and extension guide (read this first).
- `docs/SOURCING.md` — sourcing engine: connectors, normalisation, dedupe, scoring.
- `CLAUDE.md` / `AGENTS.md` — pointers for AI coding sessions.
