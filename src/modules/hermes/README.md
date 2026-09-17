# Hermes — MCP endpoint for the operator agent

`/api/mcp` lets Hermes (the operator agent, running in the cloud) **read**
GRAFIQ OS and **propose** changes. It can never change anything itself.

```
src/modules/hermes/
  auth.ts          bearer token, constant-time comparison over SHA-256 digests
  rate-limit.ts    fixed window per token, in memory
  client.ts        service-role Supabase client (Hermes has no user account)
  schemas.ts       zod input schema per tool — the only thing callable from outside
  constants.ts     limits, defaults, the approval route
  reads/           the enumerated queries: shared.ts, projects.ts, sales.ts, finance.ts, people.ts
  describe.ts      a proposal rendered as "current → proposed" against the live record
  proposals.ts     write tools → a row in pending_actions, nothing else
  queries.ts       approval-screen reads (as the signed-in user)
  actions.ts       approve / reject — runs the app's own Server Action
  tools.ts         tool registration
  components/      the approval queue UI
  hermes.test.ts   auth, rate limit, validation and currency rules
```

Route: `src/app/api/mcp/route.ts`. Approval screen: `/admin/pending`
(registered as the `approvals` module, so it appears in the sidebar under
System and the guide covers it).

## Why a service-role key, and what stops it

Hermes has no user account, so Row Level Security cannot express what it may
see. The guardrail is this module instead:

- one static bearer token (`HERMES_API_TOKEN`), constant-time compared; no
  token configured means every request is refused;
- 60 requests per minute per token, then `429`;
- **no SQL from outside** — no table name, column, filter or ordering can be
  supplied. Each tool is a fixed query with an explicit column list, zod-parsed
  arguments (unknown keys are dropped) and a capped limit, paged;
- responses never contain environment values, keys, e-mail addresses, phone
  numbers or profile links. Talent is name, role, rate and availability only.

The proxy (`src/lib/supabase/proxy.ts`) would normally answer `401` for any
`/api/*` request without a session. `siteConfig.tokenAuthRoutes` exempts this
route so it can do its own bearer authentication.

## The two rules the tools carry

Every response repeats them, because they are the two mistakes an agent would
otherwise make:

- **Profit is not cash.** `projects_overview` / `project_detail` report
  economics excluding VAT; `finance_overview` reports cash timing including
  VAT. They never match and must not be compared.
- **Currencies are never added together.** Every amount is
  `{ amount, currency }` and totals are per currency.

The numbers come from the modules that own them — `computeFinancials`,
`computeHealth`, `pipelineStats`, `toReceivableView`, `allLoads`,
`completionGate`. Only the fetching differs from the app (service role instead
of the user's session), never the maths.

## Proposals

`project_status_set`, `deal_stage_set`, `receivable_mark_paid`, `task_create`
and `client_note_add` insert one row into `pending_actions` (migration 0017)
and return its id with a human-readable summary. `pending_list` shows what is
waiting and what was decided.

Approval happens at `/admin/pending`, where `actions.ts` calls the same Server
Action the UI calls, as the signed-in user — `setProjectStatus`,
`setDealStage`, `recordReceivablePayment`, `saveTask`, `addNote`. So the QA
completion gate, the validation messages, the activity log and RLS all apply
exactly as if a person had clicked the button. If the action refuses, the
proposal stays in the queue with the reason recorded on the row.

## Limitations

- The rate limit is per server instance (serverless instances do not share it).
- One token for one client; there are no per-tool scopes.
- Writes are proposals only — by design. Anything Hermes should be able to do
  directly would need a new tool and a deliberate decision.
