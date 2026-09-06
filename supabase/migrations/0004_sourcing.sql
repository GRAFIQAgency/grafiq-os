-- GRAFIQ OS — Sourcing module v1
-- Talent + company discovery engine. Run AFTER 0001_profiles.sql (uses public.set_updated_at()).
--
-- Shared-entity principle: `talent_candidates` and `company_leads` ARE the
-- person / company records that Talent Bench and CRM will use later. Sourcing
-- only moves them through lifecycle states (in_talent_bench, crm_status).

-- ---------------------------------------------------------------------------
-- Connector registry state (the connector code lives in src/modules/sourcing/connectors)
-- ---------------------------------------------------------------------------
create table public.sourcing_sources (
  id                 text primary key,                 -- connector id, e.g. 'mock-talent'
  enabled            boolean not null default true,
  config             jsonb not null default '{}'::jsonb,
  last_run_at        timestamptz,
  last_error         text,
  records_collected  integer not null default 0,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Saved searches and search runs
-- ---------------------------------------------------------------------------
create table public.sourcing_searches (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  created_by   uuid references auth.users (id) on delete set null,
  entity_type  text not null check (entity_type in ('talent', 'company')),
  name         text not null check (char_length(name) between 1 and 200),
  filters      jsonb not null default '{}'::jsonb,
  last_run_at  timestamptz
);

create trigger sourcing_searches_set_updated_at
  before update on public.sourcing_searches
  for each row execute function public.set_updated_at();

create table public.sourcing_search_runs (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null,
  search_id          uuid references public.sourcing_searches (id) on delete set null,
  entity_type        text not null check (entity_type in ('talent', 'company')),
  filters            jsonb not null default '{}'::jsonb,
  status             text not null default 'queued'
                     check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  started_at         timestamptz,
  finished_at        timestamptz,
  sources_total      integer not null default 0,
  sources_completed  integer not null default 0,
  results_total      integer not null default 0,
  results_new        integer not null default 0,
  results_duplicates integer not null default 0,
  -- [{ sourceId, message, retries }]
  errors             jsonb not null default '[]'::jsonb
);

create index sourcing_search_runs_created_idx on public.sourcing_search_runs (created_at desc);

-- ---------------------------------------------------------------------------
-- Talent candidates (shared person entity)
-- ---------------------------------------------------------------------------
create table public.talent_candidates (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null,
  full_name           text not null,
  headline            text,
  role                text,                            -- primary role, free text (see role list in code)
  email               text,
  profile_url         text,
  portfolio_url       text,
  avatar_url          text,
  country             text,
  city                text,
  remote              boolean,
  seniority           text check (seniority is null or seniority in ('junior', 'mid', 'senior', 'lead')),
  employment_type     text check (employment_type is null or employment_type in ('freelancer', 'contractor', 'employee')),
  hourly_rate_min     numeric(10, 2),
  hourly_rate_max     numeric(10, 2),
  rate_currency       text check (rate_currency is null or rate_currency in ('CZK', 'EUR', 'USD')),
  availability        text check (availability is null or availability in ('available', 'limited', 'unavailable', 'unknown')),
  years_experience    numeric(4, 1),
  agency_experience   boolean,
  skills              text[] not null default '{}',
  technologies        text[] not null default '{}',
  languages           text[] not null default '{}',
  summary             text,
  -- Pipeline
  status              text not null default 'discovered' check (status in (
                        'discovered', 'reviewed', 'shortlisted', 'contacted', 'interview',
                        'trial', 'approved', 'preferred', 'rejected', 'archived')),
  in_talent_bench     boolean not null default false,
  bench_added_at      timestamptz,
  tags                text[] not null default '{}',
  -- Internal 1–10 ratings: { quality, communication, reliability, speed, technical, creative }
  ratings             jsonb not null default '{}'::jsonb,
  ai_score            integer check (ai_score is null or (ai_score between 0 and 100)),
  manual_score        integer check (manual_score is null or (manual_score between 0 and 100)),
  -- Freshness
  first_discovered_at timestamptz not null default now(),
  last_checked_at     timestamptz not null default now(),
  -- Deduplication keys (normalised in code)
  email_key           text,
  profile_key         text,
  portfolio_key       text,
  name_location_key   text,
  search_vector       tsvector generated always as (
    to_tsvector('simple',
      coalesce(full_name, '') || ' ' || coalesce(headline, '') || ' ' || coalesce(role, '') || ' ' ||
      coalesce(city, '') || ' ' || coalesce(country, '') || ' ' || coalesce(summary, '') || ' ' ||
      array_to_string(skills, ' ') || ' ' || array_to_string(technologies, ' ') || ' ' || array_to_string(tags, ' '))
  ) stored
);

create trigger talent_candidates_set_updated_at
  before update on public.talent_candidates
  for each row execute function public.set_updated_at();

create unique index talent_candidates_email_key_idx on public.talent_candidates (email_key) where email_key is not null;
create index talent_candidates_profile_key_idx on public.talent_candidates (profile_key) where profile_key is not null;
create index talent_candidates_portfolio_key_idx on public.talent_candidates (portfolio_key) where portfolio_key is not null;
create index talent_candidates_name_location_idx on public.talent_candidates (name_location_key) where name_location_key is not null;
create index talent_candidates_status_idx on public.talent_candidates (status, created_at desc);
create index talent_candidates_score_idx on public.talent_candidates (ai_score desc nulls last);
create index talent_candidates_search_idx on public.talent_candidates using gin (search_vector);
create index talent_candidates_skills_idx on public.talent_candidates using gin (skills);
create index talent_candidates_technologies_idx on public.talent_candidates using gin (technologies);

-- ---------------------------------------------------------------------------
-- Company leads (shared company entity)
-- ---------------------------------------------------------------------------
create table public.company_leads (
  id                  uuid primary key default gen_random_uuid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  created_by          uuid references auth.users (id) on delete set null,
  name                text not null,
  domain              text,                            -- normalised, e.g. 'example.com'
  website             text,
  logo_url            text,
  registration_id     text,                            -- e.g. IČO
  industry            text,
  country             text,
  city                text,
  employee_count      integer,
  size_bucket         text check (size_bucket is null or size_bucket in ('1-10', '11-50', '51-200', '201-500', '501-1000', '1000+')),
  revenue             numeric(16, 2),
  revenue_currency    text check (revenue_currency is null or revenue_currency in ('CZK', 'EUR', 'USD')),
  founded_year        integer,
  description         text,
  technologies        text[] not null default '{}',
  keywords            text[] not null default '{}',
  business_model      text check (business_model is null or business_model in ('b2b', 'b2c', 'both')),
  company_type        text check (company_type is null or company_type in ('saas', 'ecommerce', 'services', 'agency', 'manufacturing', 'hospitality', 'real_estate', 'other')),
  language            text,
  -- Pipeline
  status              text not null default 'discovered' check (status in (
                        'discovered', 'reviewed', 'shortlisted', 'contacted', 'qualified', 'rejected', 'archived')),
  crm_status          text check (crm_status is null or crm_status in ('prospect', 'lead', 'customer', 'lost')),
  crm_added_at        timestamptz,
  tags                text[] not null default '{}',
  lead_score          integer check (lead_score is null or (lead_score between 0 and 100)),
  manual_score        integer check (manual_score is null or (manual_score between 0 and 100)),
  -- Freshness
  first_discovered_at timestamptz not null default now(),
  last_checked_at     timestamptz not null default now(),
  -- Deduplication keys
  name_location_key   text,
  search_vector       tsvector generated always as (
    to_tsvector('simple',
      coalesce(name, '') || ' ' || coalesce(domain, '') || ' ' || coalesce(industry, '') || ' ' ||
      coalesce(city, '') || ' ' || coalesce(country, '') || ' ' || coalesce(description, '') || ' ' ||
      array_to_string(technologies, ' ') || ' ' || array_to_string(keywords, ' ') || ' ' || array_to_string(tags, ' '))
  ) stored
);

create trigger company_leads_set_updated_at
  before update on public.company_leads
  for each row execute function public.set_updated_at();

create unique index company_leads_domain_idx on public.company_leads (domain) where domain is not null;
create unique index company_leads_registration_idx on public.company_leads (registration_id) where registration_id is not null;
create index company_leads_name_location_idx on public.company_leads (name_location_key) where name_location_key is not null;
create index company_leads_status_idx on public.company_leads (status, created_at desc);
create index company_leads_score_idx on public.company_leads (lead_score desc nulls last);
create index company_leads_search_idx on public.company_leads using gin (search_vector);
create index company_leads_technologies_idx on public.company_leads using gin (technologies);

-- ---------------------------------------------------------------------------
-- Source records: one row per (connector, external id), linked to the deduplicated entity.
-- Replaces the suggested talent_candidate_sources / company_lead_sources with one table.
-- ---------------------------------------------------------------------------
create table public.sourcing_source_records (
  id                uuid primary key default gen_random_uuid(),
  entity_type       text not null check (entity_type in ('talent', 'company')),
  entity_id         uuid not null,                     -- talent_candidates.id or company_leads.id
  source_id         text not null references public.sourcing_sources (id) on delete cascade,
  source_entity_id  text not null,
  source_url        text,
  run_id            uuid references public.sourcing_search_runs (id) on delete set null,
  -- Compact normalised payload as delivered by the connector (NOT a raw page dump).
  payload           jsonb not null default '{}'::jsonb,
  retrieved_at      timestamptz not null default now(),
  unique (source_id, source_entity_id)
);

create index sourcing_source_records_entity_idx on public.sourcing_source_records (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Company buying signals and contacts
-- ---------------------------------------------------------------------------
create table public.company_signals (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references public.company_leads (id) on delete cascade,
  type         text not null,                          -- e.g. 'hiring_marketing', 'old_website' (see code)
  strength     text not null default 'medium' check (strength in ('low', 'medium', 'high')),
  confidence   numeric(3, 2) not null default 0.5 check (confidence between 0 and 1),
  detected_at  timestamptz not null default now(),
  source_id    text references public.sourcing_sources (id) on delete set null,
  description  text,
  unique (company_id, type, source_id)
);

create index company_signals_company_idx on public.company_signals (company_id);

create table public.company_contacts (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  company_id   uuid not null references public.company_leads (id) on delete cascade,
  name         text not null,
  job_title    text,
  email        text,
  phone        text,
  profile_url  text,
  source_id    text references public.sourcing_sources (id) on delete set null
);

create index company_contacts_company_idx on public.company_contacts (company_id);

-- ---------------------------------------------------------------------------
-- Role profiles (what "good" looks like for a role) — used by AI scoring
-- ---------------------------------------------------------------------------
create table public.talent_role_profiles (
  id                        uuid primary key default gen_random_uuid(),
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  name                      text not null unique,
  role                      text not null,
  description               text,
  required_skills           text[] not null default '{}',
  nice_to_have_skills       text[] not null default '{}',
  min_years_experience      numeric(4, 1),
  preferred_countries       text[] not null default '{}',
  max_hourly_rate           numeric(10, 2),
  rate_currency             text check (rate_currency is null or rate_currency in ('CZK', 'EUR', 'USD')),
  agency_experience_preferred boolean not null default false,
  communication_expectations text,
  portfolio_required        boolean not null default true,
  is_active                 boolean not null default true
);

create trigger talent_role_profiles_set_updated_at
  before update on public.talent_role_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AI evaluations (stored separately from entity data; advisory only)
-- ---------------------------------------------------------------------------
create table public.ai_evaluations (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  entity_type      text not null check (entity_type in ('talent', 'company')),
  entity_id        uuid not null,
  role_profile_id  uuid references public.talent_role_profiles (id) on delete set null,
  provider         text not null,                      -- 'heuristic' | 'claude'
  model            text,
  score            integer not null check (score between 0 and 100),
  strengths        text[] not null default '{}',
  weaknesses       text[] not null default '{}',
  missing_info     text[] not null default '{}',
  risks            text[] not null default '{}',
  reasoning        text,
  -- Per-factor breakdown: [{ factor, weight, score, note }]
  factors          jsonb not null default '[]'::jsonb
);

create index ai_evaluations_entity_idx on public.ai_evaluations (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Internal notes and activity log (polymorphic; reusable by other modules)
-- ---------------------------------------------------------------------------
create table public.internal_notes (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  entity_type  text not null,
  entity_id    uuid not null,
  author_id    uuid references auth.users (id) on delete set null,
  author_name  text,
  body         text not null check (char_length(body) between 1 and 5000)
);

create index internal_notes_entity_idx on public.internal_notes (entity_type, entity_id, created_at desc);

create table public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  entity_type  text not null,
  entity_id    uuid not null,
  action       text not null,                          -- e.g. 'status_changed', 'saved_to_bench'
  actor_id     uuid references auth.users (id) on delete set null,
  actor_name   text,
  details      jsonb not null default '{}'::jsonb
);

create index activity_log_entity_idx on public.activity_log (entity_type, entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Seed: connectors + one role profile
-- ---------------------------------------------------------------------------
insert into public.sourcing_sources (id) values ('mock-talent'), ('mock-companies'), ('csv-import');

insert into public.talent_role_profiles
  (name, role, description, required_skills, nice_to_have_skills, min_years_experience,
   preferred_countries, max_hourly_rate, rate_currency, agency_experience_preferred,
   communication_expectations, portfolio_required)
values
  ('Senior Webflow Developer', 'Webflow Developer',
   'Builds premium marketing sites in Webflow with custom interactions.',
   array['Webflow', 'CMS', 'Responsive', 'JavaScript', 'GSAP'],
   array['Figma', 'SEO', 'Multilingual', 'Accessibility'],
   4, array['Czech Republic', 'Slovakia', 'Germany', 'Austria', 'Poland'],
   60, 'EUR', true,
   'Independent, proactive, clear async communication in English.', true),
  ('UI/UX Designer', 'UI/UX Designer',
   'Designs web and product interfaces with strong visual craft.',
   array['Figma', 'UX', 'UI', 'Prototyping'],
   array['Webflow', 'Motion', 'Design Systems'],
   3, array['Czech Republic', 'Slovakia'],
   45, 'EUR', true,
   'Comfortable presenting work to clients.', true);

-- ---------------------------------------------------------------------------
-- Row Level Security: internal tool, every signed-in user can read/manage (v1).
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'sourcing_sources', 'sourcing_searches', 'sourcing_search_runs', 'sourcing_source_records',
    'talent_candidates', 'company_leads', 'company_signals', 'company_contacts',
    'talent_role_profiles', 'ai_evaluations', 'internal_notes', 'activity_log']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy "Authenticated users can manage %s" on public.%I for all to authenticated using (true) with check (true)',
      t, t);
  end loop;
end $$;
