-- GRAFIQ OS — Business Settings v1
-- Company-wide defaults (single row) and configurable role hourly costs.
-- Run AFTER 0001_profiles.sql (reuses public.set_updated_at()).

-- One company = one settings row. `id` is pinned to 1 so there can never be a second row.
create table public.business_settings (
  id               integer primary key default 1 check (id = 1),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  company_name     text not null default 'GRAFIQ',
  default_currency text not null default 'CZK' check (default_currency in ('CZK', 'EUR', 'USD')),
  -- Percentages, e.g. 21.00 = 21 %.
  vat_rate         numeric(5, 2) not null default 21 check (vat_rate >= 0 and vat_rate <= 100),
  target_margin    numeric(5, 2) not null default 60 check (target_margin >= 0 and target_margin < 100),
  warning_margin   numeric(5, 2) not null default 50 check (warning_margin >= 0 and warning_margin < 100),
  minimum_margin   numeric(5, 2) not null default 40 check (minimum_margin >= 0 and minimum_margin < 100),
  -- Payment milestones as an array of percentages that add up to 100, e.g. [50, 30, 20].
  payment_terms    jsonb not null default '[50, 30, 20]'::jsonb,
  constraint business_settings_margin_order check (minimum_margin <= warning_margin and warning_margin <= target_margin)
);

comment on table public.business_settings is 'Company-wide business defaults. Exactly one row (id = 1).';

create trigger business_settings_set_updated_at
  before update on public.business_settings
  for each row execute function public.set_updated_at();

insert into public.business_settings (id) values (1);

-- Default internal hourly costs per role.
create table public.role_costs (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 100),
  hourly_cost  numeric(14, 2) not null default 0 check (hourly_cost >= 0),
  currency     text not null default 'CZK' check (currency in ('CZK', 'EUR', 'USD')),
  is_active    boolean not null default true,
  position     integer not null default 0
);

comment on table public.role_costs is 'Default internal hourly cost per role. Referenced by future modules (Pricing, Capacity).';

create unique index role_costs_name_unique on public.role_costs (lower(name));
create index role_costs_active_idx on public.role_costs (is_active, position);

create trigger role_costs_set_updated_at
  before update on public.role_costs
  for each row execute function public.set_updated_at();

-- Example starting roles and costs (CZK/hour). Edit them in Settings → Business.
insert into public.role_costs (name, hourly_cost, currency, position) values
  ('Designer',        900,  'CZK', 0),
  ('Developer',       1100, 'CZK', 1),
  ('Project Manager', 800,  'CZK', 2),
  ('3D Designer',     1000, 'CZK', 3),
  ('Copywriter',      700,  'CZK', 4),
  ('Marketing',       800,  'CZK', 5),
  ('Other',           600,  'CZK', 6);

-- Row Level Security: every signed-in GRAFIQ OS user can read and manage settings (v1).
alter table public.business_settings enable row level security;
alter table public.role_costs enable row level security;

create policy "Authenticated users can manage business settings"
  on public.business_settings for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage role costs"
  on public.role_costs for all
  to authenticated
  using (true)
  with check (true);
