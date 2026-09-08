import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import { CURRENCIES } from "@/config/currencies";
import type { Dictionary } from "@/lib/i18n/config";

import { PAYABLE_CATEGORIES, PAYABLE_STATUSES, RECEIVABLE_STATUSES } from "../constants";
import type { FinancePickers } from "../queries";
import type { ItemFilters } from "../types";

/** GET filter form shared by the Receivables and Payables pages. */
export function ItemFiltersForm({ kind, filters, pickers, action, dict }: { kind: "receivable" | "payable"; filters: ItemFilters; pickers: Pick<FinancePickers, "projects" | "clients">; action: string; dict: Dictionary }) {
  const t = kind === "receivable" ? dict.finance.receivables.filters : dict.finance.payables.filters;
  const s = dict.sourcing.search;
  const statuses = kind === "receivable" ? RECEIVABLE_STATUSES : PAYABLE_STATUSES;
  return (
    <form method="get" action={action} className="flex flex-col gap-3 rounded-lg border bg-card p-4 md:flex-row md:flex-wrap md:items-end" data-guide="finance-filters">
      <FilterField label={dict.common.search} className="md:min-w-56 md:flex-1"><TextFilter name="q" defaultValue={filters.q} placeholder={t.search} /></FilterField>
      <FilterField label={t.project} className="md:w-48"><SelectFilter name="project" defaultValue={filters.projectId} anyLabel={s.any} options={pickers.projects.map((p) => ({ value: p.id, label: p.name }))} /></FilterField>
      {kind === "receivable" ? <FilterField label={dict.finance.receivables.filters.client} className="md:w-44"><SelectFilter name="client" defaultValue={filters.clientId} anyLabel={s.any} options={pickers.clients.map((c) => ({ value: c.id, label: c.name }))} /></FilterField> : null}
      {kind === "payable" ? <FilterField label={dict.finance.payables.filters.category} className="md:w-40"><SelectFilter name="category" defaultValue={filters.category} anyLabel={s.any} options={PAYABLE_CATEGORIES.map((c) => ({ value: c, label: dict.finance.payables.categories[c] }))} /></FilterField> : null}
      <FilterField label={t.currency} className="md:w-28"><SelectFilter name="currency" defaultValue={filters.currency} anyLabel={s.any} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></FilterField>
      <FilterField label={t.status} className="md:w-40"><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={statuses.map((v) => ({ value: v, label: dict.finance.statuses[v] }))} /></FilterField>
      <FilterField label={t.due} className="md:w-40"><TextFilter name="due" type="date" defaultValue={filters.dueBefore} /></FilterField>
      <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={action} />
    </form>
  );
}
