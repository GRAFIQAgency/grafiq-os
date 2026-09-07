-- GRAFIQ OS — Projects v1
-- Operational delivery centre. Reuses shared entities:
--   client  → public.company_leads (Sourcing / CRM company)
--   person  → public.talent_candidates (Sourcing / Talent Bench) or auth.users (internal)
--   notes / activity → public.internal_notes / public.activity_log with entity_type = 'project'
-- Run AFTER 0007_talent_bench.sql.

create table public.projects (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  created_by              uuid references auth.users (id) on delete set null,
  name                    text not null check (char_length(name) between 1 and 200),
  client_id               uuid references public.company_leads (id) on delete set null,
  -- Project-specific contact snapshot (not a CRM)
  contact_name            text,
  contact_email           text,
  contact_phone           text,
  project_type            text not null default 'other',           -- website | branding | marketing | creative_3d | retainer | other | custom
  status                  text not null default 'draft' check (status in (
                            'draft', 'onboarding', 'active', 'waiting_client', 'internal_review',
                            'completed', 'on_hold', 'cancelled', 'archived')),
  priority                text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  owner_id                uuid references auth.users (id) on delete set null,
  start_date              date,
  deadline                date,
  currency                text not null check (currency in ('CZK', 'EUR', 'USD')),
  -- FINANCIAL BASELINE ("what did we sell?") — frozen at creation, never rewritten by Pricing edits.
  baseline_revenue        numeric(14, 2) not null default 0 check (baseline_revenue >= 0),
  baseline_direct_cost    numeric(14, 2) not null default 0 check (baseline_direct_cost >= 0),
  baseline_target_margin  numeric(5, 2) not null default 60 check (baseline_target_margin >= 0 and baseline_target_margin < 100),
  baseline_created_at     timestamptz not null default now(),
  pricing_estimate_id     uuid unique references public.pricing_estimates (id) on delete set null,
  manual_progress         integer check (manual_progress is null or manual_progress between 0 and 100),
  notes                   text,
  completed_at            timestamptz
);

create index projects_status_idx on public.projects (status, deadline);
create index projects_client_idx on public.projects (client_id);
create index projects_owner_idx on public.projects (owner_id);

-- Snapshot of the pricing cost breakdown at conversion time.
create table public.project_baseline_costs (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects (id) on delete cascade,
  name          text not null,
  kind          text not null check (kind in ('hourly', 'fixed')),
  hours         numeric(10, 2) not null default 0,
  hourly_rate   numeric(14, 2) not null default 0,
  fixed_amount  numeric(14, 2) not null default 0,
  total         numeric(14, 2) not null default 0,
  position      integer not null default 0
);
create index project_baseline_costs_project_idx on public.project_baseline_costs (project_id);

-- Team: exactly one of talent_candidate_id (bench person) / user_id (internal user).
create table public.project_members (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  project_id           uuid not null references public.projects (id) on delete cascade,
  talent_candidate_id  uuid references public.talent_candidates (id) on delete restrict,
  user_id              uuid references auth.users (id) on delete restrict,
  display_name         text not null,                                -- snapshot for stable history
  project_role         text not null check (char_length(project_role) between 1 and 100),
  status               text not null default 'active' check (status in ('planned', 'active', 'completed', 'removed')),
  planned_hours        numeric(10, 2) check (planned_hours is null or planned_hours >= 0),
  starts_on            date,
  ends_on              date,
  -- COST RATE SNAPSHOT: copied at assignment time; later Talent/Settings changes never touch it.
  cost_rate            numeric(10, 2) check (cost_rate is null or cost_rate >= 0),
  currency             text check (currency is null or currency in ('CZK', 'EUR', 'USD')),
  rate_source          text not null default 'manual' check (rate_source in ('talent', 'role_default', 'manual')),
  notes                text,
  constraint project_members_one_identity check (
    (talent_candidate_id is not null and user_id is null) or (talent_candidate_id is null and user_id is not null)),
  unique (project_id, talent_candidate_id),
  unique (project_id, user_id)
);
create index project_members_project_idx on public.project_members (project_id, status);
create index project_members_person_idx on public.project_members (talent_candidate_id);

create table public.project_milestones (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  project_id        uuid not null references public.projects (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 200),
  description       text,
  due_date          date,
  owner_member_id   uuid references public.project_members (id) on delete set null,
  status            text not null default 'not_started' check (status in ('not_started', 'in_progress', 'waiting', 'completed', 'blocked')),
  position          integer not null default 0,
  notes             text,
  completed_at      timestamptz
);
create index project_milestones_project_idx on public.project_milestones (project_id, position);

create table public.project_tasks (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  project_id          uuid not null references public.projects (id) on delete cascade,
  milestone_id        uuid references public.project_milestones (id) on delete set null,
  title               text not null check (char_length(title) between 1 and 200),
  description         text,
  assignee_member_id  uuid references public.project_members (id) on delete set null,
  status              text not null default 'todo' check (status in ('todo', 'in_progress', 'blocked', 'internal_review', 'done')),
  priority            text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  estimated_hours     numeric(10, 2) check (estimated_hours is null or estimated_hours >= 0),
  actual_hours        numeric(10, 2) check (actual_hours is null or actual_hours >= 0),
  start_date          date,
  due_date            date,
  blocked_reason      text,
  notes               text,
  position            integer not null default 0,
  completed_at        timestamptz
);
create index project_tasks_project_idx on public.project_tasks (project_id, status);
create index project_tasks_assignee_idx on public.project_tasks (assignee_member_id);
create index project_tasks_due_idx on public.project_tasks (due_date);

create table public.project_links (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  label       text not null check (char_length(label) between 1 and 100),
  url         text not null,
  kind        text not null default 'other' check (kind in ('figma', 'webflow', 'drive', 'client_docs', 'staging', 'production', 'other'))
);
create index project_links_project_idx on public.project_links (project_id);

create table public.project_direct_costs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  project_id      uuid not null references public.projects (id) on delete cascade,
  label           text not null check (char_length(label) between 1 and 200),
  category        text not null default 'other' check (category in (
                    'external_specialist', 'stock', 'software', 'printing', 'photography', 'subcontractor', 'other')),
  estimated_cost  numeric(14, 2) not null default 0 check (estimated_cost >= 0),
  actual_cost     numeric(14, 2) check (actual_cost is null or actual_cost >= 0),
  currency        text not null check (currency in ('CZK', 'EUR', 'USD')),
  note            text
);
create index project_direct_costs_project_idx on public.project_direct_costs (project_id);

-- Scope changes: approved ones affect CURRENT / FORECAST economics, never the baseline.
create table public.project_change_requests (
  id                      uuid primary key default gen_random_uuid(),
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  project_id              uuid not null references public.projects (id) on delete cascade,
  title                   text not null check (char_length(title) between 1 and 200),
  description             text,
  status                  text not null default 'draft' check (status in ('draft', 'sent', 'approved', 'rejected')),
  additional_revenue      numeric(14, 2) not null default 0 check (additional_revenue >= 0),
  additional_direct_cost  numeric(14, 2) not null default 0 check (additional_direct_cost >= 0),
  deadline_impact_days    integer,
  notes                   text,
  approved_at             timestamptz
);
create index project_change_requests_project_idx on public.project_change_requests (project_id, status);

-- updated_at triggers
do $$
declare t text;
begin
  foreach t in array array['projects', 'project_members', 'project_milestones', 'project_tasks', 'project_direct_costs', 'project_change_requests']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- RLS: every signed-in GRAFIQ user may manage projects (single company, v1).
do $$
declare t text;
begin
  foreach t in array array['projects', 'project_baseline_costs', 'project_members', 'project_milestones', 'project_tasks', 'project_links', 'project_direct_costs', 'project_change_requests']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Authenticated users can manage %s" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
