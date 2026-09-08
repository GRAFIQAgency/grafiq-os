-- GRAFIQ OS — Per-unit pricing ("300 × 3D product at a fixed price per piece")
-- Adds a fourth pay / pricing model, 'unit' (quantity × price per unit), to the
-- Pricing calculator, Talent pay models, project members and the project
-- baseline. Run AFTER 0012_member_pay_models_and_proposals.sql.

-- 1. Pricing: estimates can be priced as a total or per unit; cost lines can be per unit.
alter table public.pricing_estimates
  add column if not exists pricing_basis text not null default 'total' check (pricing_basis in ('total', 'per_unit')),
  add column if not exists unit_count numeric(12, 2) check (unit_count is null or unit_count >= 0),
  add column if not exists unit_price numeric(14, 2) check (unit_price is null or unit_price >= 0),
  add column if not exists unit_label text;
comment on column public.pricing_estimates.pricing_basis is 'total = revenue entered directly; per_unit = revenue = unit_count × unit_price (revenue column keeps the computed total).';

alter table public.pricing_cost_items drop constraint if exists pricing_cost_items_kind_check;
alter table public.pricing_cost_items
  add constraint pricing_cost_items_kind_check check (kind in ('hourly', 'fixed', 'percent', 'unit'));
alter table public.pricing_cost_items
  add column if not exists quantity numeric(12, 2) not null default 0 check (quantity >= 0),
  add column if not exists unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  add column if not exists unit_label text;

-- 2. Project baseline keeps the same information.
alter table public.projects
  add column if not exists baseline_unit_count numeric(12, 2) check (baseline_unit_count is null or baseline_unit_count >= 0),
  add column if not exists baseline_unit_price numeric(14, 2) check (baseline_unit_price is null or baseline_unit_price >= 0),
  add column if not exists unit_label text;

alter table public.project_baseline_costs drop constraint if exists project_baseline_costs_kind_check;
alter table public.project_baseline_costs
  add constraint project_baseline_costs_kind_check check (kind in ('hourly', 'fixed', 'percent', 'unit'));
alter table public.project_baseline_costs
  add column if not exists quantity numeric(12, 2) not null default 0,
  add column if not exists unit_cost numeric(14, 2) not null default 0,
  add column if not exists unit_label text;

-- 3. Project members paid per delivered unit.
alter table public.project_members drop constraint if exists project_members_pay_model_check;
alter table public.project_members
  add constraint project_members_pay_model_check check (pay_model in ('hourly', 'fixed', 'percent', 'unit'));
alter table public.project_members
  add column if not exists unit_cost numeric(14, 2) check (unit_cost is null or unit_cost >= 0),
  add column if not exists planned_units numeric(12, 2) check (planned_units is null or planned_units >= 0),
  add column if not exists delivered_units numeric(12, 2) not null default 0 check (delivered_units >= 0);
comment on column public.project_members.delivered_units is 'Units delivered so far (pay_model = unit); current cost = delivered × unit_cost, forecast = max(delivered, planned) × unit_cost.';

-- 4. Talent Bench: people paid per unit (default unit price + label).
alter table public.talent_bench_details drop constraint if exists talent_bench_details_pricing_model_check;
alter table public.talent_bench_details
  add constraint talent_bench_details_pricing_model_check check (pricing_model in ('hourly', 'fixed', 'percent', 'unit'));
alter table public.talent_bench_details
  add column if not exists unit_price numeric(14, 2) check (unit_price is null or unit_price >= 0),
  add column if not exists unit_label text;
