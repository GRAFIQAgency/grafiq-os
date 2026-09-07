-- GRAFIQ OS — Sales v1 (CRM pipeline)
-- The deal IS the shared company record (public.company_leads) with a CRM stage.
-- Sales adds a 1:1 extension row with deal fields. Identity, signals, contacts,
-- notes, activity, tags and scores stay on the shared record and are NOT
-- duplicated here. Run AFTER 0008_projects.sql.

-- 1. Pipeline stages on the shared record. `crm_status` was limited to
--    prospect / lead / customer / lost; Sales uses a full pipeline.
alter table public.company_leads drop constraint if exists company_leads_crm_status_check;
update public.company_leads set crm_status = 'qualified' where crm_status = 'lead';
alter table public.company_leads
  add constraint company_leads_crm_status_check
  check (crm_status is null or crm_status in ('prospect', 'contacted', 'qualified', 'proposal', 'negotiation', 'customer', 'lost'));

create index if not exists company_leads_crm_status_idx on public.company_leads (crm_status) where crm_status is not null;

-- 2. Deal details, 1:1 with the company.
create table public.company_crm_details (
  company_id           uuid primary key references public.company_leads (id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  owner_id             uuid references auth.users (id) on delete set null,
  deal_value           numeric(14, 2) check (deal_value is null or deal_value >= 0),
  deal_currency        text check (deal_currency is null or deal_currency in ('CZK', 'EUR', 'USD')),
  -- Null = use the default probability of the current stage.
  probability          integer check (probability is null or probability between 0 and 100),
  expected_close       date,
  next_step            text,
  next_action_at       date,
  lost_reason          text,
  -- Optional link to the Pricing estimate behind the proposal (Projects can reuse it later).
  pricing_estimate_id  uuid references public.pricing_estimates (id) on delete set null,
  won_at               timestamptz,
  lost_at              timestamptz
);

comment on table public.company_crm_details is 'Sales deal fields, 1:1 with company_leads. Company data stays shared.';

create index company_crm_details_owner_idx on public.company_crm_details (owner_id);
create index company_crm_details_next_action_idx on public.company_crm_details (next_action_at);

create trigger company_crm_details_set_updated_at
  before update on public.company_crm_details
  for each row execute function public.set_updated_at();

alter table public.company_crm_details enable row level security;

create policy "Authenticated users can manage crm details"
  on public.company_crm_details for all
  to authenticated
  using (true)
  with check (true);
