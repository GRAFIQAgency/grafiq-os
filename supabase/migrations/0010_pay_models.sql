-- GRAFIQ OS — Pay models
-- People are paid per hour, fixed per project, or as a percentage of the
-- client price (sales commission, PM fee). Pricing gets a third cost-line
-- kind ('percent'), the Talent Bench stores each person's default model.
-- Run AFTER 0009_sales.sql.

-- 1. Pricing cost lines: 'percent' = percent × client price.
alter table public.pricing_cost_items drop constraint if exists pricing_cost_items_kind_check;
alter table public.pricing_cost_items
  add constraint pricing_cost_items_kind_check check (kind in ('hourly', 'fixed', 'percent'));
alter table public.pricing_cost_items
  add column if not exists percent numeric(5, 2) not null default 0 check (percent between 0 and 100);

-- 2. Project baseline snapshot keeps the same three kinds.
alter table public.project_baseline_costs drop constraint if exists project_baseline_costs_kind_check;
alter table public.project_baseline_costs
  add constraint project_baseline_costs_kind_check check (kind in ('hourly', 'fixed', 'percent'));
alter table public.project_baseline_costs
  add column if not exists percent numeric(5, 2) not null default 0;

-- 3. Talent Bench: how the person is usually paid + the matching default value.
alter table public.talent_bench_details
  add column if not exists pricing_model text not null default 'hourly'
    check (pricing_model in ('hourly', 'fixed', 'percent')),
  add column if not exists fixed_price numeric(14, 2) check (fixed_price is null or fixed_price >= 0),
  add column if not exists margin_percent numeric(5, 2) check (margin_percent is null or margin_percent between 0 and 100);

comment on column public.talent_bench_details.pricing_model is 'hourly = hourly_cost per hour; fixed = fixed_price per project (typical, editable per estimate); percent = margin_percent of the client price.';
