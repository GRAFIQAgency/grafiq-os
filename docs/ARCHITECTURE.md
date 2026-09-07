# GRAFIQ OS — Architecture

This document explains how the codebase is organised and how it should be
extended. It is written for humans and for future AI coding sessions.

## Goals

- One internal app for a small agency (roughly 5–30 users).
- Add modules over time **without restructuring** what already exists.
- Prefer the simplest maintainable solution. Avoid abstraction until a second
  concrete use exists.

## Layers

```
┌───────────────────────────────────────────────────────────┐
│ src/app            Routes. Thin. Compose module components │
├───────────────────────────────────────────────────────────┤
│ src/modules/<x>    Feature code: UI, types, logic, data    │
├───────────────────────────────────────────────────────────┤
│ src/components     App shell (layout/), shared pieces,     │
│                    shadcn primitives (ui/)                 │
├───────────────────────────────────────────────────────────┤
│ src/config         Module registry, site config, env       │
│ src/lib            Supabase clients, utilities             │
│ src/types          Database row types                      │
└───────────────────────────────────────────────────────────┘
```

Dependency direction: `app → modules → components/config/lib/types`.
Modules may import shared components and other modules' **types**, but should
not import another module's components or actions. If two modules need the
same logic, move it to `src/lib` or a dedicated shared module. One documented
exception: `talent` builds on the shared person entity owned by `sourcing`, so
it may import sourcing **services** and person-entity components (one-way).

## The module registry

`src/config/modules.ts` is the single source of truth for what modules exist:

```ts
{ id: "projects", title: "Projects", href: "/projects", icon: FolderKanban,
  description: "...", status: "planned", group: "modules" }
```

It feeds:

- the sidebar (`components/layout/sidebar-nav.tsx`), grouped by `group`;
- the top-bar title (`components/layout/page-title.tsx`) via `getModuleByPathname`;
- placeholder pages (`components/shared/module-placeholder.tsx`).

Changing a module's title, icon or order happens here and nowhere else.

## Anatomy of a module

```
src/modules/<name>/
  components/     React components used only by this module
  types.ts        Domain types (Project, Quote, …). Import DB row types from src/types
  services.ts     Pure business logic: calculations, status rules, formatting.
                  No React, no Supabase. Easy to unit test. (May be named after
                  what it does, e.g. `calculations.ts`; add `*.test.ts` next to it.)
  queries.ts      Server-side reads via createClient() from lib/supabase/server
  actions.ts      "use server" mutations. Validate → write → revalidatePath/redirect
  validation.ts   Parse/validate FormData or JSON input
  data/           Static/placeholder data (remove when real data exists)
  README.md       Optional notes for the module
```

Create only the files a module needs. A module with no writes has no
`actions.ts`. Split files when they grow past roughly 200 lines; prefer several
small components over one large one.

### The `auth` module (existing)

- `queries.ts` — `getCurrentUser()` (cached per request) and `requireUser()`
  (redirects to login). Use `requireUser()` in any server code that needs the
  user; the `(app)` layout already calls it.
- `actions.ts` — `signIn` (used with `useActionState`) and `signOut`.
- `components/login-form.tsx` — the only client component in the module.

### The `dashboard` module (existing, placeholder)

`data/placeholder.ts` holds example numbers, clearly marked. When real modules
exist, add `queries.ts` that aggregates their data and delete the placeholder.

### The `pricing` module (existing, v1)

The reference implementation of a "real" module. Notable choices:

- `calculations.ts` is pure and unit-tested (`calculations.test.ts`).
  Margin thresholds, the default target margin, default currency and role
  presets come from Business Settings via `modules/settings/queries.ts`;
  people presets (per-person pay model + rate) come from
  `modules/talent/queries.ts` (`listActiveTalent`) and `presets.ts` resolves a
  typed/picked name to the person's pay model and own rate, or the role
  default (never mixing currencies);
- Cost lines have three kinds: `hourly` (hours × rate), `fixed` (flat) and
  `percent` (share of the client price, e.g. sales commission). Percent lines
  scale with the price, so `recommendedSellingPrice` moves their share into
  the divisor: `price = fixedCosts / (1 − target − share)`. Projects snapshot
  the same three kinds into `project_baseline_costs`;
  the page passes them into the calculator as props.
- The client component `components/pricing-calculator.tsx` owns form state
  as strings (`draft.ts`) and derives the summary with `useMemo`. Everything
  else in `components/` is presentational.
- Saving goes through one Server Action (`actions.ts` → `saveEstimate`) that
  validates an untrusted object with `validation.ts`, writes the estimate and
  replaces its cost items, then `revalidatePath`s the module route.
- Reopening a saved estimate is URL-driven: `/pricing?estimate=<id>`. The page
  fetches it server-side and passes it in as `initialEstimate`, using `key`
  to reset client state when the id changes.
- Reads (`queries.ts`) fail soft with a server-side log so the page still
  renders if the migration has not been applied yet.

### The `settings` module (existing, Business Settings v1)

Company-wide defaults for one company: name, default currency, VAT, margin
thresholds (target / warning / minimum), payment milestones and role hourly
costs. Tables: `business_settings` (single row, `id = 1`) and `role_costs`.

- Other modules read through `modules/settings/queries.ts`
  (`getBusinessSettings`, `getMarginThresholds`, `listActiveRoleCosts`) and
  the pure helpers in `services.ts`. Never query the tables directly.
- Settings → Business leads with **People rates**: per-person pay model
  (`hourly` / `fixed` / `percent`) and the matching value. Those rows are
  Talent Bench people (`talent_candidates` + `talent_bench_details`
  `pricing_model`, `hourly_cost`, `fixed_price`, `margin_percent`), rendered
  by `modules/talent/components/people-rates-table.tsx` and composed into the
  settings route. Role costs are collapsed as an optional fallback for people
  without their own rate.
- Before the migration is applied, `getBusinessSettings()` returns
  `DEFAULT_BUSINESS_SETTINGS` so pages keep working.
- Deleting a role fails with a friendly message when a future table references
  it (foreign-key violation); deactivating is the safe alternative.
- Shared currency list: `src/config/currencies.ts`; `Currency` type in `src/types/database.ts`.

### The `sourcing` module (existing, v1)

Talent and company discovery engine — see `docs/SOURCING.md`. Notable choices:
connector registry with per-source enable/disable, one polymorphic
`sourcing_source_records` table, deterministic dedupe keys, scoring results kept
in `ai_evaluations`, and shared entities (`talent_candidates`, `company_leads`)
that Talent Bench, Sales (CRM) and Projects reuse instead of copying.

### The `talent` module (existing, Talent Bench v1)

Operational "people inventory" for candidates saved from Sourcing. The person
stays the shared `talent_candidates` record; Talent adds a 1:1
`talent_bench_details` row (bench status, engagement, cost, day rate, capacity,
available-from, commercial notes). Membership = `in_talent_bench`; archiving
flips it to false and sets `bench_status = 'archived'` — nothing is deleted.
Dependency direction: talent → sourcing services (`services/bench.ts`
`markInTalentBench`, ingest, talent-input) and person-entity components
(notes, ratings, tags, source records); sourcing never imports talent.
Read API for future modules lives in `modules/talent/queries.ts`
(`listActiveTalent`, `listAvailableTalent`, `listTalentByRole`,
`getTalentCapacityData`). Generic UI primitives shared by both modules live in
`src/components/shared` (chips, status-badge, detail-section, filter-form).

### The `projects` module (existing, Projects v1)

Delivery centre. Reuses shared entities: client = `company_leads`, person =
`talent_candidates` (bench) or `auth.users` (internal), notes/activity =
`internal_notes` / `activity_log` with `entity_type = 'project'`. Tables
(migration 0008): `projects` (with a frozen financial BASELINE and a unique
`pricing_estimate_id`), `project_baseline_costs`, `project_members` (cost-rate
SNAPSHOT), `project_milestones`, `project_tasks`, `project_links`,
`project_direct_costs`, `project_change_requests`.

- `calculations/financials.ts` — baseline vs current vs forecast (pure, tested).
  Actual labour = task actual hours × member rate snapshot. Approved change
  requests raise current revenue / forecast cost, never the baseline.
- `calculations/health.ts` — rule-based, explainable health using Settings
  margin thresholds. `calculations/progress.ts` — progress with a stated basis.
- `services/rates.ts` — suggested member rate: Talent person cost → Settings
  role default → manual; snapshotted on the member.
- Read API for Dashboard / Finance / Capacity: `getProjectStats`,
  `listProjectFinancials`, `listProjectAssignments`, `projectIdsByEstimate`.
- Dependency direction: projects → pricing/settings/talent/sourcing
  services & queries (one-way).

### The `sales` module (existing, CRM pipeline v1)

Where companies saved from Sourcing become deals and customers. The deal IS the
shared `company_leads` record: pipeline membership = `crm_status is not null`,
the stage = `crm_status` (`prospect → contacted → qualified → proposal →
negotiation → customer | lost`, migration 0009 widens the check constraint).
Sales adds a 1:1 `company_crm_details` row (owner, value + currency,
probability override, expected close, next step + date, lost reason, linked
Pricing estimate, won/lost timestamps). Contacts stay in the shared
`company_contacts`; notes/activity use `entity_type = 'company'`.

- Entry points: "Save to CRM" in Sourcing and "Add company" in Sales both call
  `sourcing/services/crm.ts` (`markInCrm`) — one code path, no duplicates.
- Exit point: "Create project" on a deal opens `/projects/new?client=<id>&estimate=<id>`.
- `services/pipeline.ts` — pure rules (tested): stage default probability,
  weighted value, overdue next action, stage transitions, filters, sorting, stats.
- Read API for Dashboard / Finance / Projects: `getPipelineStats`,
  `listCustomers`, `listPipelineCompanies`. Projects exposes
  `listProjectsByClient` for the deal page.
- Dependency direction: sales → sourcing / pricing / projects (one-way).

### The `guide` module (existing) — the interactive tutorial

`src/modules/guide/content.ts` is the product's work-process description in
chapters and steps (setup → pricing → talent → bench → projects → clients → sales → sources → what's next).
It powers three surfaces: the `/guide` page with progress checkboxes, the "?"
help panel in the top bar (chapter for the current route), and the cross-page
tour (`?guide=<step-id>` spotlights the element with a matching
`data-guide="<anchor>"` attribute). Texts live under `guide.*` in the
dictionaries; progress lives in `localStorage`.

**Rule: every feature change updates the guide in the same change** — add or
edit steps, keep `data-guide` anchors on the controls the steps talk about, and
add both language texts. `content.test.ts` enforces coverage of every active
module and that step links are real routes. "What's next" lists planned
modules automatically from the registry.

## PWA / mobile

Installable web app, no separate mobile codebase. `src/app/manifest.ts`,
`public/sw.js`, `components/layout/pwa-register.tsx` (production only),
`src/app/offline/page.tsx` (public route). Top bars use the `.safe-top`
utility so they clear the iPhone status bar in standalone mode. Brand icons:
`components/shared/grafiq-logo.tsx` (inline SVG), `src/app/icon.svg`,
`src/app/apple-icon.png`, `public/icons/*` — regenerate from
`public/brand/grafiq-mark.svg` if the logo changes.

## Internationalisation (EN / CS)

The UI is bilingual without any i18n library:

- `src/lib/i18n/dictionaries/en.ts` is the source of truth; its shape is the
  `Dictionary` type and `cs.ts` must implement every key (TypeScript enforces it).
- The locale lives in a cookie (`grafiq:locale`), not in the URL, so routes
  stay unchanged. `LanguageSwitcher` calls the `setLocale` Server Action and
  refreshes.
- Server Components and Actions: `const dict = await getDictionary()` from
  `@/lib/i18n/server`. Client Components: `const { dict, locale } = useI18n()`
  from `@/lib/i18n/client`.
- Placeholders use `{name}` and `interpolate()` from `@/lib/i18n/interpolate`.
- Module titles/descriptions live under `dict.modules.<id>`, not in the registry.
- Page tab titles: `export const generateMetadata = moduleMetadata("<id>")`.
- Pure logic (validation, calculations) must not import dictionaries. Pass the
  messages it needs as a parameter (see `modules/pricing/validation.ts`).
- Number and date formatting uses `INTL_LOCALES[locale]` (`en-GB` / `cs-CZ`).

When adding UI text: add the key to `en.ts` and `cs.ts` in the same change.

## Routing conventions

- `src/app/(auth)/…` — public pages (login). Chrome-free layout.
- `src/app/(app)/…` — authenticated pages. The layout calls `requireUser()`
  and renders `AppShell`.
- A module's routes live under its `href`, e.g. `(app)/projects/[id]/page.tsx`.
- Pages are Server Components by default. They fetch via module `queries.ts`
  and pass plain data to components. Mark a component `"use client"` only when
  it needs state, effects or browser APIs.
- Page `metadata.title` should match the module title.

## Authentication & authorisation

1. `src/proxy.ts` → `lib/supabase/proxy.ts` runs on every non-asset request.
   It refreshes the Supabase session cookie and redirects:
   - signed-out user on a protected route → `/login?next=<path>`
   - signed-in user on `/login` → `/dashboard`
2. `(app)/layout.tsx` calls `requireUser()` as a second check.
3. Postgres Row Level Security is the real security boundary. Every new table
   must enable RLS and define policies in its migration.

Roles: `profiles.role` is `'admin' | 'member'`. Nothing enforces roles in the
UI yet. When a module needs role checks, add a helper in `modules/auth`
(e.g. `requireRole("admin")`) rather than checking `profile.role` inline in
components.

## Data access

- Server: `import { createClient } from "@/lib/supabase/server"` inside
  Server Components, Server Actions and Route Handlers. Always `await` it.
- Browser: `import { createClient } from "@/lib/supabase/client"` only in
  client components that truly need it (realtime, file uploads).
- Types: `src/types/database.ts` is hand-written while the schema is tiny.
  Once a few tables exist, generate types with the Supabase CLI and pass
  `Database` as the generic to both client factories.
- Migrations: one SQL file per change in `supabase/migrations/`, numbered
  sequentially. Never edit an applied migration; add a new one.

## UI conventions

- shadcn/ui primitives live in `src/components/ui`. Add more with
  `npx shadcn@latest add <component>`. Do not hand-edit them beyond small
  tweaks; re-adding a component would overwrite changes.
- App-level building blocks (`PageHeader`, `PlaceholderBadge`, `EmptyPanel`)
  live in `src/components/shared`. Put a component there only when at least
  two modules use it.
- Theme tokens are CSS variables in `src/app/globals.css`. Use Tailwind
  semantic classes (`bg-card`, `text-muted-foreground`, `border`) rather than
  raw colours so the light theme keeps working.
- Style direction: minimal, neutral, generous spacing, subtle borders and
  hover states. No gradients, no decorative animation.
- Every page starts with `<PageHeader>` and wraps content in `space-y-*`.
- Example or placeholder data is always marked with `<PlaceholderBadge>`.

## Adding a module — checklist

1. Add the entry to `src/config/modules.ts` (or flip `status` to `"active"`).
2. Write the migration in `supabase/migrations/NNNN_<name>.sql` with RLS.
3. Add row types to `src/types/database.ts`.
4. Create `src/modules/<name>/` with `types.ts`, then `queries.ts`,
   `services.ts`, `actions.ts`, `validation.ts`, `components/` as needed.
5. Replace `<ModulePlaceholder>` in `src/app/(app)/<name>/page.tsx` with the
   module's components.
6. Delete the module's `README.md` placeholder or update it with real notes.
7. Run `npm run lint` and `npm run build`.

## Things deliberately not done yet

- No validation library (add `zod` when forms grow beyond login).
- No form library, global state, or data-fetching client.
- No theme toggle (dark is default; light tokens exist).
- No working search / command palette (top-bar search is a visual placeholder).
- No role enforcement, no admin user management UI.
- Tests exist only for pure business logic (Vitest, `npm test`). No component
  or end-to-end tests yet.
