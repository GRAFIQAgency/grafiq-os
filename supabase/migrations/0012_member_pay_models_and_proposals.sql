-- GRAFIQ OS — Project member pay models + Pricing proposals
-- Run AFTER 0011_capacity.sql.

-- 1. A freelancer can be paid differently per project: hourly (cost_rate × hours),
--    fixed per project (fixed_cost) or a percentage of the project price (percent).
--    Capacity never reads these — capacity is time.
alter table public.project_members
  add column if not exists pay_model text not null default 'hourly' check (pay_model in ('hourly', 'fixed', 'percent')),
  add column if not exists fixed_cost numeric(14, 2) check (fixed_cost is null or fixed_cost >= 0),
  add column if not exists percent numeric(5, 2) check (percent is null or percent between 0 and 100);

comment on column public.project_members.pay_model is 'hourly = cost_rate × hours; fixed = fixed_cost for the whole project; percent = percent of current project revenue.';

-- 2. Client-facing pricing proposals ("pricing plans"): generated from an
--    estimate (AI or template), edited in the app, then shared by a public link.
create table public.pricing_proposals (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  estimate_id    uuid references public.pricing_estimates (id) on delete set null,
  -- Unguessable token for the public page /p/<token>.
  share_token    text not null unique,
  title          text not null check (char_length(title) between 1 and 200),
  client_name    text,
  intro          text,
  currency       text not null check (currency in ('CZK', 'EUR', 'USD')),
  vat_rate       numeric(5, 2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  -- [{ id, title, description, kind: 'hourly' | 'fixed', hours, rate, amount }]
  items          jsonb not null default '[]'::jsonb,
  notes          text,
  valid_until    date,
  status         text not null default 'draft' check (status in ('draft', 'shared')),
  shared_at      timestamptz,
  generated_by   text check (generated_by is null or generated_by in ('claude', 'template'))
);

comment on table public.pricing_proposals is 'Client-facing pricing plans generated from estimates; shared read-only via share_token.';

create index pricing_proposals_estimate_idx on public.pricing_proposals (estimate_id);

create trigger pricing_proposals_set_updated_at
  before update on public.pricing_proposals
  for each row execute function public.set_updated_at();

alter table public.pricing_proposals enable row level security;

-- Signed-in GRAFIQ users manage proposals. The public page reads by token
-- through the server-side service role (no anonymous policy on purpose).
create policy "Authenticated users can manage proposals"
  on public.pricing_proposals for all
  to authenticated
  using (true)
  with check (true);
