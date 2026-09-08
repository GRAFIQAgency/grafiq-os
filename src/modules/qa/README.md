# QA — Delivery Quality v1

Quality control before a project ships. Reusable templates, a frozen checklist
per project, fast inline review, fix tasks, explicit approval and a completion
gate on the project status.

```
src/modules/qa/
  calculations/
    checklist.ts   item rules, progress, approval eligibility, derived status, approval invalidation
    gate.ts        completionGate — required checklists must be approved before "completed"
    recommend.ts   template recommendation from project type (mapping in constants.ts)
    snapshot.ts    template items → frozen checklist items, fix-task title
    stats.ts       overview grouping / sorting / filters, project summary, getQaStats, attention items
    qa.test.ts     rule tests (Vitest)
  actions/         Server Actions: templates.ts (CRUD, reorder, duplicate, archive, delete-if-unused),
                   checklists.ts (create from template, settings, item updates, approve/revoke, fix task, delete)
  components/      /qa overview + filters + tabs, templates list + editor, checklist detail,
                   project QA tab + header signal, Start QA form
  services/filters.ts  URL params → QaFilters
  queries.ts       Supabase reads (templates, overview, project checklists, checklist detail, reviewers, stats)
  validation.ts    template / item / checklist / item-update validation
  constants.ts     statuses, project-type → template mapping, list limit
  types.ts         domain types
```

## Rules (all in `calculations/`)

- Item states: `pending`, `pass`, `fail`, `na` (only if the item allows N/A), `blocked`.
- Checklist status is derived from items; **approval is explicit** and only
  possible when every required item is `pass` (or an allowed `na`) and no item
  is `fail` or `blocked`. Any later item change that breaks that rule revokes
  the approval automatically (`nextChecklistState`).
- `required_for_completion` (default on) makes the checklist a **completion
  gate**: `setProjectStatus(..., "completed")` refuses while it is unapproved.
- Fix tasks are ordinary project tasks (`QA: <item title>`), linked from the
  item; a done task never auto-passes the check.
- Templates are snapshotted into checklists; editing or archiving a template
  never changes existing checklists. Templates used by a checklist cannot be
  deleted, only archived.
- Sampling (delivered units / checked units / note) is descriptive metadata for
  large unit deliveries; it does not change the rules.

## Data

Migration `supabase/migrations/0015_qa.sql`: `qa_templates`, `qa_template_items`,
`qa_checklists`, `qa_checklist_items`, RLS "authenticated can manage", indexes,
`updated_at` triggers and five seeded GRAFIQ templates (`seed_key`: website,
branding, creative_3d, marketing, generic). Reviewer and approver reference
`auth.users`; names are looked up from `profiles` separately.

## Read API for other modules

`getQaStats()` → counts for Dashboard; `listQaAttentionItems()` → failed /
blocked / overdue checklists; `getProjectQaSummary(projectId)` → per-project
signal; `listRequiredChecklistStates(projectId)` → input for `completionGate`.
