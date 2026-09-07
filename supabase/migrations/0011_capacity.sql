-- GRAFIQ OS — Capacity Planner v1
-- Capacity is DERIVED: booked hours come from project members / tasks, talent
-- capacity comes from talent_bench_details. Nothing calculated is stored.
-- The only new persistent data is the monthly capacity of INTERNAL users
-- (auth profiles), which had no home yet. 1:1 with public.profiles.
-- Run AFTER 0010_pay_models.sql.

create table public.profile_capacity_details (
  profile_id               uuid primary key references public.profiles (id) on delete cascade,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  -- Hard upper limit per month (hours). Required once a row exists.
  monthly_capacity_hours   integer not null check (monthly_capacity_hours between 0 and 744),
  -- Normal planning workload per month; null = use monthly_capacity_hours.
  preferred_monthly_hours  integer check (preferred_monthly_hours is null or preferred_monthly_hours between 0 and 744),
  -- False = this person is not planned (e.g. founder doing sales only, or on leave).
  capacity_active          boolean not null default true,
  notes                    text
);

comment on table public.profile_capacity_details is 'Monthly capacity of internal GRAFIQ users (1:1 with profiles). Talent Bench people keep theirs in talent_bench_details.';

create trigger profile_capacity_details_set_updated_at
  before update on public.profile_capacity_details
  for each row execute function public.set_updated_at();

alter table public.profile_capacity_details enable row level security;

create policy "Authenticated users can manage profile capacity"
  on public.profile_capacity_details for all
  to authenticated
  using (true)
  with check (true);
