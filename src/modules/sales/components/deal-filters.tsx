import Link from "next/link";
import { Columns3, List } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import { CRM_STAGES, DEAL_SORTS } from "../constants";
import type { DealFilters, DealSort, PipelineView, SalesPickers } from "../types";

export function DealFiltersForm({ filters, sort, view, pickers, dict }: { filters: DealFilters; sort: DealSort; view: PipelineView; pickers: SalesPickers; dict: Dictionary }) {
  const t = dict.sales;
  const s = dict.sourcing.search;
  const base = getModule("sales").href;
  const viewHref = (v: PipelineView) => {
    const params = new URLSearchParams();
    for (const [k, val] of Object.entries(currentParams(filters, sort))) params.set(k, val);
    if (v === "board") params.set("view", "board");
    const qs = params.toString();
    return qs ? `${base}?${qs}` : base;
  };

  return (
    <form method="get" action={base} className="space-y-3 rounded-lg border bg-card p-4" data-guide="sales-filters">
      {view === "board" ? <input type="hidden" name="view" value="board" /> : null}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1">
          <TextFilter name="q" defaultValue={filters.q} placeholder={t.filters.search} />
        </FilterField>
        <FilterField label={t.filters.stage} className="md:w-44">
          <SelectFilter name="stage" defaultValue={filters.stage} anyLabel={t.filters.openStages} options={CRM_STAGES.map((v) => ({ value: v, label: t.stages[v] }))} />
        </FilterField>
        <FilterField label={t.filters.owner} className="md:w-44">
          <SelectFilter name="owner" defaultValue={filters.ownerId} anyLabel={s.any} options={pickers.owners.map((o) => ({ value: o.id, label: o.label }))} />
        </FilterField>
        <FilterField label={t.sort} className="md:w-44">
          <SelectFilter name="sort" defaultValue={sort} anyLabel={t.sorts.next_action} allowAny={false} options={DEAL_SORTS.map((v) => ({ value: v, label: t.sorts[v] }))} />
        </FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={view === "board" ? `${base}?view=board` : base} />
        <div className="flex items-center gap-1 md:ml-auto" data-guide="sales-view">
          <Link href={viewHref("list")} aria-current={view === "list" ? "page" : undefined} className={cn(buttonVariants({ size: "sm", variant: view === "list" ? "secondary" : "ghost" }))}>
            <List data-icon="inline-start" />{t.views.list}
          </Link>
          <Link href={viewHref("board")} aria-current={view === "board" ? "page" : undefined} className={cn(buttonVariants({ size: "sm", variant: view === "board" ? "secondary" : "ghost" }))}>
            <Columns3 data-icon="inline-start" />{t.views.board}
          </Link>
        </div>
      </div>
      <details open={hasMore(filters)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <FilterField label={t.filters.overdueOnly}><SelectFilter name="overdue" defaultValue={filters.overdueOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.filters.includeClosed}><SelectFilter name="closed" defaultValue={filters.includeClosed ? "1" : undefined} anyLabel={t.filters.openOnly} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={dict.sourcing.talent.country}><TextFilter name="country" defaultValue={filters.country} /></FilterField>
          <FilterField label={dict.sourcing.companies.industry}><TextFilter name="industry" defaultValue={filters.industry} /></FilterField>
        </div>
      </details>
    </form>
  );
}

function currentParams(f: DealFilters, sort: DealSort): Record<string, string> {
  const out: Record<string, string> = {};
  if (f.q) out.q = f.q;
  if (f.stage) out.stage = f.stage;
  if (f.ownerId) out.owner = f.ownerId;
  if (f.overdueOnly) out.overdue = "1";
  if (f.includeClosed) out.closed = "1";
  if (f.country) out.country = f.country;
  if (f.industry) out.industry = f.industry;
  if (sort !== "next_action") out.sort = sort;
  return out;
}

function hasMore(f: DealFilters) {
  return Boolean(f.overdueOnly || f.includeClosed || f.country || f.industry);
}
