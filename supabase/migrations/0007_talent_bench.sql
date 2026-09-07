-- GRAFIQ OS — Talent Bench v1
-- Operational, staffing-oriented details for people already saved to the bench.
-- 1:1 extension of the shared person record (public.talent_candidates).
-- Identity, skills, links, ratings, notes, activity and source records stay on
-- the shared record and are NOT duplicated here. Run AFTER 0004_sourcing.sql.

create table public.talent_bench_details (
  talent_candidate_id     uuid primary key references public.talent_candidates (id) on delete cascade,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  -- Operational bench status (the recruiting pipeline status stays on talent_candidates.status).
  bench_status            text not null default 'active'
                          check (bench_status in ('active', 'preferred', 'limited', 'unavailable', 'paused', 'archived')),
  -- Commercial
  engagement_type         text check (engagement_type is null or engagement_type in ('freelancer', 'contractor', 'part_time', 'employee', 'other')),
  hourly_cost             numeric(10, 2) check (hourly_cost is null or hourly_cost >= 0),
  cost_currency           text check (cost_currency is null or cost_currency in ('CZK', 'EUR', 'USD')),
  day_rate                numeric(10, 2) check (day_rate is null or day_rate >= 0),
  minimum_engagement      text,
  commercial_notes        text,
  -- Capacity (current availability itself lives on talent_candidates.availability)
  available_from          date,
  max_monthly_hours       integer check (max_monthly_hours is null or max_monthly_hours between 0 and 744),
  preferred_monthly_hours integer check (preferred_monthly_hours is null or preferred_monthly_hours between 0 and 744)
);

comment on table public.talent_bench_details is 'Talent Bench operational fields, 1:1 with talent_candidates. Person data stays shared.';

create index talent_bench_details_status_idx on public.talent_bench_details (bench_status);

create trigger talent_bench_details_set_updated_at
  before update on public.talent_bench_details
  for each row execute function public.set_updated_at();

alter table public.talent_bench_details enable row level security;

create policy "Authenticated users can manage talent bench details"
  on public.talent_bench_details for all
  to authenticated
  using (true)
  with check (true);
