-- GRAFIQ OS — Pricing module v1
-- Saved pricing estimates and their cost items.
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- AFTER 0001_profiles.sql (it reuses public.set_updated_at()).

create table public.pricing_estimates (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  created_by    uuid references auth.users (id) on delete set null default auth.uid(),
  project_name  text not null check (char_length(project_name) between 1 and 200),
  client_name   text,
  currency      text not null check (currency in ('CZK', 'EUR', 'USD')),
  -- Client price excluding VAT, in the estimate's currency.
  revenue       numeric(14, 2) not null default 0 check (revenue >= 0),
  -- Target gross margin as a percentage, e.g. 60.00 = 60 %.
  target_margin numeric(5, 2) not null default 60 check (target_margin >= 0 and target_margin < 100)
);

comment on table public.pricing_estimates is 'Pricing / profit calculator estimates.';

create table public.pricing_cost_items (
  id            uuid primary key default gen_random_uuid(),
  estimate_id   uuid not null references public.pricing_estimates (id) on delete cascade,
  created_at    timestamptz not null default now(),
  name          text not null check (char_length(name) between 1 and 200),
  -- 'hourly' = hours × hourly_rate, 'fixed' = fixed_amount
  kind          text not null check (kind in ('hourly', 'fixed')),
  hours         numeric(10, 2) not null default 0 check (hours >= 0),
  hourly_rate   numeric(14, 2) not null default 0 check (hourly_rate >= 0),
  fixed_amount  numeric(14, 2) not null default 0 check (fixed_amount >= 0),
  -- Display order inside the estimate.
  position      integer not null default 0
);

comment on table public.pricing_cost_items is 'Direct cost lines belonging to a pricing estimate.';

create index pricing_cost_items_estimate_id_idx
  on public.pricing_cost_items (estimate_id, position);

create index pricing_estimates_created_at_idx
  on public.pricing_estimates (created_at desc);

create trigger pricing_estimates_set_updated_at
  before update on public.pricing_estimates
  for each row execute function public.set_updated_at();

-- Row Level Security.
-- Pricing v1: every signed-in GRAFIQ OS user can view and manage all company
-- estimates. Tighten these policies when roles/ownership rules are introduced.
alter table public.pricing_estimates enable row level security;
alter table public.pricing_cost_items enable row level security;

create policy "Authenticated users can manage pricing estimates"
  on public.pricing_estimates for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage pricing cost items"
  on public.pricing_cost_items for all
  to authenticated
  using (true)
  with check (true);
