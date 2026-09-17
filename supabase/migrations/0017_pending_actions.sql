-- GRAFIQ OS — Pending actions (Hermes approval queue)
-- The MCP endpoint at /api/mcp lets the operator agent (Hermes) READ the
-- system and PROPOSE changes. A proposal is only a row here; nothing in the
-- application changes until a signed-in human approves it on /admin/pending,
-- where the approval runs the same Server Action the UI uses.
-- Run AFTER 0016_finance.sql.

create table public.pending_actions (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  -- What is being proposed. One value per MCP write tool.
  action_type   text not null check (action_type in (
                  'project_status_set', 'deal_stage_set', 'receivable_mark_paid', 'task_create', 'client_note_add')),
  -- Where it would land. Informational: there is no FK, because the target
  -- lives in a different table per action_type and must survive deletion.
  -- `target_id` is the row that changes, or the parent row for an insert
  -- (the project of a proposed task, the company of a proposed note).
  target_table  text not null,
  target_id     uuid not null,
  -- Validated arguments of the proposal (never free-form SQL).
  payload       jsonb not null default '{}'::jsonb,
  -- Why the agent proposes it, in its own words.
  reason        text,
  proposed_by   text not null default 'hermes',
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  decided_at    timestamptz,
  decided_by    uuid references auth.users (id) on delete set null,
  -- Outcome of executing the approved action (or the error that stopped it).
  result        text
);

comment on table public.pending_actions is 'Proposals from the Hermes MCP endpoint. Approving one on /admin/pending executes it through the normal Server Action; the row itself never changes application data.';
comment on column public.pending_actions.payload is 'Validated tool arguments (zod). Approval re-validates through the same action the UI calls.';

create index pending_actions_status_idx on public.pending_actions (status, created_at desc);
create index pending_actions_target_idx on public.pending_actions (target_table, target_id);

-- RLS: same rule as every other table — any signed-in GRAFIQ user may manage.
-- Hermes does not have a user account; it writes with the service-role key,
-- which bypasses RLS, and can only ever insert rows into THIS table.
alter table public.pending_actions enable row level security;

create policy "Authenticated users can manage pending actions"
  on public.pending_actions for all
  to authenticated
  using (true)
  with check (true);
