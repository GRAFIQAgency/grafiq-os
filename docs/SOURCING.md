# Sourcing module

Internal engine for discovering **talent** (people who could work with GRAFIQ)
and **companies / leads** (potential clients). Pipeline:

```
DISCOVER → COLLECT → NORMALIZE → DEDUPLICATE → ENRICH → AI SCORE → HUMAN REVIEW → SAVE TO GRAFIQ OS
```

Talent: search → results → review → **Save to Talent Bench**.
Companies: search → results → review → **Save to CRM**.

## Architecture

```
src/modules/sourcing/
  connectors/     SourceConnector contract, registry, mock + CSV connectors, demo data
  services/       Pure logic: normalize, dedupe, filters, csv, freshness
                  Server logic: ingest (pipeline), search-runner, activity, actor
  scoring/        heuristic (rule-based, tested), claude (optional), config (weights)
  queries/        Server reads (lists with server-side filters + pagination, details)
  actions/        Server Actions (search, talent, companies, sources, notes)
  components/     shared/ talent/ companies/ sources/ searches/ overview/
  types/          Domain types + filter types
  constants.ts    Roles, technologies, statuses, signal types, thresholds
src/app/(app)/sourcing/   Thin routes: overview, talent, talent/[id], companies, companies/[id], searches, sources
```

Pages never contain business logic: they parse URL params with
`services/filters.ts`, call `queries/*` and compose components. All writes go
through `actions/*`.

## Shared entities (all-in-one principle)

`talent_candidates` and `company_leads` are **the** person and company records
of GRAFIQ OS. Sourcing creates them and moves them through lifecycle states:

- Talent: `status` pipeline (discovered → … → preferred / rejected / archived)
  and `in_talent_bench` + `bench_added_at`. The future Talent module reads
  `in_talent_bench = true`.
- Companies: `status` pipeline and `crm_status` (`prospect` on "Save to CRM")
  + `crm_added_at`. The future CRM module reads `crm_status is not null`.

"Already in CRM" is simply `crm_status !== null` on the same row, so a
duplicate CRM record can never be created.

## Database (`supabase/migrations/0004_sourcing.sql`)

| Table | Purpose |
| --- | --- |
| `sourcing_sources` | Per-connector state: enabled, last run, last error, records collected |
| `sourcing_searches` | Saved searches (entity type + filters JSON) |
| `sourcing_search_runs` | One row per search job: status, per-source progress, counts, errors |
| `sourcing_source_records` | One row per (connector, external id) → linked to the entity. Keeps source URL, retrieval time and the compact normalised payload (plus merge conflicts). Replaces `talent_candidate_sources` / `company_lead_sources`. |
| `talent_candidates` | Shared person entity + pipeline, bench flag, tags, ratings, scores, dedupe keys, full-text vector |
| `company_leads` | Shared company entity + pipeline, CRM status, tags, scores, dedupe keys, full-text vector |
| `company_signals` | Buying signals: type, strength, confidence, detected date, source, description |
| `company_contacts` | Public business contacts per company |
| `talent_role_profiles` | What "good" looks like per role; drives talent scoring |
| `ai_evaluations` | Every scoring result (provider, score, strengths, weaknesses, missing info, risks, factors). Stored separately from entity data. |
| `internal_notes` | Polymorphic notes (author, timestamp, text) |
| `activity_log` | Polymorphic lightweight audit trail |

Row Level Security: every signed-in user can read and manage (internal tool).
Generated `search_vector` columns power full-text search; GIN indexes cover
skills/technologies/tags arrays.

## Connector system

`connectors/types.ts` defines `SourceConnector`:

```ts
{ id, name, type, supportedEntityTypes, rateLimit?,
  search(request) → { talent[], companies[] },   // already normalised
  fetchDetails?(entityType, sourceEntityId), testConnection() }
```

Rules:

- Connectors only use **permitted** access (official/public APIs, feeds,
  public pages that allow automated access, CSV, manual import). Never bypass
  logins, CAPTCHAs, rate limits, robots rules or private APIs.
- Each connector normalises its own raw data into `NormalizedTalent` /
  `NormalizedCompany`. The rest of the system never sees source-specific fields.
- Connectors are enabled/disabled individually in **Sourcing → Sources**
  (`sourcing_sources.enabled`). Unknown to the DB = disabled.
- API keys stay server-side (`process.env`); connectors run only in Server
  Actions.

Shipped connectors: `mock-talent`, `mock-companies` (deterministic demo data
to prove the engine) and `csv-import` (manual). 

### Adding a connector

1. Create `connectors/<name>.ts` implementing `SourceConnector`. Map the
   source's shape to `NormalizedTalent` / `NormalizedCompany`; give every
   record a stable `sourceEntityId` and a `sourceUrl`.
2. Register it in `connectors/registry.ts`.
3. Add a migration: `insert into public.sourcing_sources (id, enabled) values ('<id>', false);`
4. Throw on failure — the runner retries gently and isolates the error.
5. Add the connector's display strings if needed (name comes from code).

## Search runs

`services/search-runner.ts` creates a `sourcing_search_runs` row, then for each
enabled connector: search (≤2 attempts, 500 ms backoff) → ingest → update
counters and the connector's health row. One failing source never stops the
others; errors are stored on the run and shown in the UI. v1 runs inline in
the Server Action (mock connectors are instant); the run row already carries
progress so execution can move to a background job later without UI changes.

## Normalisation

`services/normalize.ts` builds deterministic keys: lower-cased email,
protocol/www/query-stripped URLs, registrable domain, and a diacritics-free
"name|location" key that ignores legal suffixes (s.r.o., GmbH, Ltd…).
`NormalizedCompany.employeeCount` also derives `size_bucket`.

## Deduplication

`services/dedupe.ts` (pure, tested) + lookups in `services/ingest.ts`:

- Talent keys: email (0.99), profile URL (0.95), portfolio URL (0.85),
  name + location (0.80).
- Company keys: registration id (0.99), domain (0.98), name + location (0.80).
- Confidence ≥ `MERGE_THRESHOLD` (0.8) → merge into the existing record:
  existing values win, empty fields are filled, arrays are unioned. Conflicting
  scalars are **not** overwritten; they are stored as `conflicts` in the source
  record payload and the merge is logged in the activity log.
- Every source occurrence is preserved as a `sourcing_source_records` row.

## AI scoring

`scoring/`:

- `heuristic.ts` — deterministic, explainable scorers (tested). Talent is
  compared to a **role profile** (required / nice-to-have skills, experience,
  rate, location, agency background, portfolio). Companies are scored on
  company fit, size, industry, buying signals, website opportunity, growth,
  location and budget potential with weights in `scoring/config.ts`.
- `claude.ts` — optional refinement with Claude (`claude-opus-5` via the
  official SDK). Active only when `ANTHROPIC_API_KEY` is set and the user asks
  for "Re-score with AI"; any failure falls back to the heuristic.
- Results are stored in `ai_evaluations` (never on the entity itself except a
  cached `ai_score` / `lead_score`), with strengths, weaknesses, missing
  information, risks, reasoning and per-factor breakdown.
- Scores are **advisory**. `manual_score` overrides them; humans decide.

## Review UX

List pages are server-filtered and paginated (URL params). The client
`ReviewList` adds keyboard review (↑↓ move, A approve, R reject, S save,
X skip, Space select) and bulk actions (mark reviewed, reject, save, tag,
export CSV). Detail pages use cards, not modals.

## Talent Bench / CRM integration

- `actions/talent.ts` → `saveTalentToBench(ids)` sets `in_talent_bench`, promotes
  unreviewed candidates to `shortlisted`, logs `saved_to_bench`.
- `actions/companies.ts` → `saveCompaniesToCrm(ids)` sets `crm_status = 'prospect'`
  only where it is null, logs `saved_to_crm`. Cards show "Already in CRM" with a
  link to the record when set.
- Future Talent / CRM modules should read these tables directly (no copying).

## Data freshness

`first_discovered_at`, `last_checked_at`, `updated_at` are stored; records not
checked for `STALE_AFTER_DAYS` (30) show a stale hint. Connectors may implement
`fetchDetails()` so a "refresh from source" action can be added.

## Remaining TODOs

- Real permitted connectors (job/freelancer platforms with APIs, company
  registers, search APIs) — add one at a time.
- Website opportunity analysis (measured vs detected vs AI opinion) — planned
  section exists on the company detail page.
- Role-profile management UI (profiles are seeded by migration for now).
- Background execution + scheduled searches; cancel/retry of individual runs.
- Manual "add candidate / company" form (CSV import covers it today).
- Lead-score factor weights in Business Settings.
