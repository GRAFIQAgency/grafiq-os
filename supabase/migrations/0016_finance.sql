-- GRAFIQ OS — Finance v1 (management finance & cash flow)
-- Finance is the management cockpit, NOT accounting: cash accounts with a
-- manually maintained balance, expected client payments (receivables),
-- expected outgoing payments (payables), recurring operating costs and a
-- ledger of actual cash movements (cash events). Project profitability is
-- NOT stored here — it is read from the Projects module.
-- Reuses: projects, company_leads (client / supplier), talent_candidates
-- (payee), auth.users (created_by). Run AFTER 0015_qa.sql.

-- ---------------------------------------------------------------------------
-- Cash / bank accounts — the manual starting point of every forecast
-- ---------------------------------------------------------------------------
create table public.finance_accounts (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  created_by       uuid references auth.users (id) on delete set null,
  name             text not null check (char_length(name) between 1 and 100),
  currency         text not null check (currency in ('CZK', 'EUR', 'USD')),
  type             text not null default 'bank' check (type in ('bank', 'cash', 'other')),
  -- MANAGEMENT balance: typed in by a person, never reconstructed from events.
  current_balance  numeric(14, 2) not null default 0,
  balance_as_of    date not null default current_date,
  is_active        boolean not null default true,
  notes            text
);
comment on column public.finance_accounts.current_balance is 'Manually maintained balance as of balance_as_of. Cash events dated after balance_as_of are added on top; earlier ones are assumed to be included already.';

-- ---------------------------------------------------------------------------
-- Receivables — money a client is expected to pay
-- ---------------------------------------------------------------------------
create table public.finance_receivables (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id) on delete set null,
  project_id           uuid references public.projects (id) on delete set null,
  project_name         text,                                            -- snapshot, survives project deletion
  client_id            uuid references public.company_leads (id) on delete set null,
  client_name          text,                                            -- snapshot / free text
  label                text not null check (char_length(label) between 1 and 200),
  -- Cash-flow snapshot: net + VAT rate → gross amount actually expected in the bank.
  net_amount           numeric(14, 2) not null check (net_amount >= 0),
  vat_rate             numeric(5, 2) not null default 0 check (vat_rate >= 0 and vat_rate <= 100),
  amount               numeric(14, 2) not null check (amount >= 0),     -- gross = net × (1 + vat_rate / 100)
  currency             text not null check (currency in ('CZK', 'EUR', 'USD')),
  due_date             date not null,
  expected_date        date,                                            -- when we really expect the money, if different
  percent_of_contract  numeric(5, 2) check (percent_of_contract is null or (percent_of_contract >= 0 and percent_of_contract <= 100)),
  invoice_reference    text,
  invoice_sent_at      date,
  notes                text,
  -- Soft cancellation keeps the row auditable; 'open' rows drive status, forecast and reconciliation.
  status               text not null default 'open' check (status in ('open', 'cancelled')),
  cancelled_at         timestamptz,
  position             integer not null default 0
);
create index finance_receivables_project_idx on public.finance_receivables (project_id);
create index finance_receivables_due_idx on public.finance_receivables (status, due_date);

-- ---------------------------------------------------------------------------
-- Payables — money GRAFIQ expects to pay (project costs and company expenses)
-- ---------------------------------------------------------------------------
create table public.finance_payables (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  created_by           uuid references auth.users (id) on delete set null,
  label                text not null check (char_length(label) between 1 and 200),
  amount               numeric(14, 2) not null check (amount >= 0),
  currency             text not null check (currency in ('CZK', 'EUR', 'USD')),
  due_date             date not null,
  project_id           uuid references public.projects (id) on delete set null,
  project_name         text,
  talent_candidate_id  uuid references public.talent_candidates (id) on delete set null,
  supplier_id          uuid references public.company_leads (id) on delete set null,
  payee_name           text,                                            -- snapshot / free text (freelancer, supplier…)
  category             text not null default 'other' check (category in (
                         'freelancer', 'subcontractor', 'software', 'printing', 'photography', 'equipment',
                         'accounting', 'legal', 'office', 'marketing', 'hosting', 'insurance', 'other')),
  notes                text,
  status               text not null default 'open' check (status in ('open', 'cancelled')),
  cancelled_at         timestamptz
);
create index finance_payables_project_idx on public.finance_payables (project_id);
create index finance_payables_due_idx on public.finance_payables (status, due_date);
create index finance_payables_talent_idx on public.finance_payables (talent_candidate_id);

-- ---------------------------------------------------------------------------
-- Recurring operating costs — a definition, expanded into future occurrences
-- by the forecast engine. Never materialised as rows.
-- ---------------------------------------------------------------------------
create table public.finance_recurring_costs (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  created_by     uuid references auth.users (id) on delete set null,
  name           text not null check (char_length(name) between 1 and 120),
  category       text not null default 'software' check (category in (
                   'software', 'accounting', 'office', 'rent', 'phone', 'hosting', 'insurance', 'marketing', 'legal', 'other')),
  amount         numeric(14, 2) not null check (amount >= 0),
  currency       text not null check (currency in ('CZK', 'EUR', 'USD')),
  frequency      text not null default 'monthly' check (frequency in ('monthly', 'quarterly', 'yearly')),
  -- The next occurrence that has NOT been paid yet. Recording a payment advances it.
  next_due_date  date not null,
  is_active      boolean not null default true,
  notes          text
);
create index finance_recurring_costs_active_idx on public.finance_recurring_costs (is_active, next_due_date);

-- ---------------------------------------------------------------------------
-- Cash events — actual money that entered or left the company (the ledger)
-- ---------------------------------------------------------------------------
create table public.finance_cash_events (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  created_by         uuid references auth.users (id) on delete set null,
  direction          text not null check (direction in ('in', 'out')),
  amount             numeric(14, 2) not null check (amount > 0),
  currency           text not null check (currency in ('CZK', 'EUR', 'USD')),
  occurred_at        date not null,
  account_id         uuid references public.finance_accounts (id) on delete set null,
  receivable_id      uuid references public.finance_receivables (id) on delete set null,
  payable_id         uuid references public.finance_payables (id) on delete set null,
  recurring_cost_id  uuid references public.finance_recurring_costs (id) on delete set null,
  -- Display snapshot so the ledger stays readable when the linked row goes away.
  label              text not null check (char_length(label) between 1 and 200),
  note               text,
  -- Controlled correction: history is never deleted, a wrong event is voided.
  voided_at          timestamptz,
  void_reason        text,
  constraint finance_cash_events_one_link check (
    (case when receivable_id is null then 0 else 1 end)
    + (case when payable_id is null then 0 else 1 end)
    + (case when recurring_cost_id is null then 0 else 1 end) <= 1),
  constraint finance_cash_events_direction check (
    (receivable_id is null or direction = 'in')
    and (payable_id is null or direction = 'out')
    and (recurring_cost_id is null or direction = 'out'))
);
create index finance_cash_events_occurred_idx on public.finance_cash_events (occurred_at desc);
create index finance_cash_events_receivable_idx on public.finance_cash_events (receivable_id);
create index finance_cash_events_payable_idx on public.finance_cash_events (payable_id);
create index finance_cash_events_account_idx on public.finance_cash_events (account_id);

-- Integrity: the event currency must match the linked receivable / payable /
-- recurring cost / account (a CHECK cannot look at other tables, so a trigger does).
create or replace function public.finance_cash_event_check()
returns trigger language plpgsql as $$
declare linked text;
begin
  if new.receivable_id is not null then
    select currency into linked from public.finance_receivables where id = new.receivable_id;
    if linked is distinct from new.currency then raise exception 'cash event currency % does not match receivable currency %', new.currency, linked; end if;
  end if;
  if new.payable_id is not null then
    select currency into linked from public.finance_payables where id = new.payable_id;
    if linked is distinct from new.currency then raise exception 'cash event currency % does not match payable currency %', new.currency, linked; end if;
  end if;
  if new.recurring_cost_id is not null then
    select currency into linked from public.finance_recurring_costs where id = new.recurring_cost_id;
    if linked is distinct from new.currency then raise exception 'cash event currency % does not match recurring cost currency %', new.currency, linked; end if;
  end if;
  if new.account_id is not null then
    select currency into linked from public.finance_accounts where id = new.account_id;
    if linked is distinct from new.currency then raise exception 'cash event currency % does not match account currency %', new.currency, linked; end if;
  end if;
  return new;
end $$;

create trigger finance_cash_events_check
  before insert or update on public.finance_cash_events
  for each row execute function public.finance_cash_event_check();

-- updated_at + RLS (every signed-in GRAFIQ user may manage Finance; single company)
do $$
declare t text;
begin
  foreach t in array array['finance_accounts', 'finance_receivables', 'finance_payables', 'finance_recurring_costs']
  loop
    execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
  foreach t in array array['finance_accounts', 'finance_receivables', 'finance_payables', 'finance_recurring_costs', 'finance_cash_events']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Authenticated users can manage %s" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;
