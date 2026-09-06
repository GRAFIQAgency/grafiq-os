import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";

import { COMPANY_STATUSES, INDUSTRIES, SIGNAL_TYPES, SIZE_BUCKETS } from "../../constants";
import type { CompanyFilters } from "../../types";
import { FilterActions, FilterField, SelectFilter, TextFilter } from "../shared/filter-form";

export function CompanyFiltersForm({ filters, dict }: { filters: CompanyFilters; dict: Dictionary }) {
  const t = dict.sourcing.companies;
  const s = dict.sourcing.search;
  const base = `${getModule("sourcing").href}/companies`;

  return (
    <form method="get" action={base} className="space-y-4 rounded-lg border bg-card p-4" data-guide="sourcing-filters">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1">
          <TextFilter name="q" defaultValue={filters.q} placeholder={s.companySearchPlaceholder} />
        </FilterField>
        <FilterField label={dict.sourcing.talent.country} className="md:w-44">
          <TextFilter name="country" defaultValue={filters.country} />
        </FilterField>
        <FilterField label={t.industry} className="md:w-48">
          <SelectFilter name="industry" defaultValue={filters.industry} anyLabel={s.any} options={INDUSTRIES.map((i) => ({ value: i, label: i }))} />
        </FilterField>
        <FilterField label={t.size} className="md:w-36">
          <SelectFilter name="size" defaultValue={filters.sizeBucket} anyLabel={s.any} options={SIZE_BUCKETS.map((b) => ({ value: b, label: b }))} />
        </FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={base} />
      </div>

      <details open={hasMoreFilters(filters)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <FilterField label={dict.sourcing.talent.city}><TextFilter name="city" defaultValue={filters.city} /></FilterField>
          <FilterField label={`${t.employees} ${t.employeesMin}`}><TextFilter name="employeesMin" type="number" defaultValue={filters.employeesMin} /></FilterField>
          <FilterField label={`${t.employees} ${t.employeesMax}`}><TextFilter name="employeesMax" type="number" defaultValue={filters.employeesMax} /></FilterField>
          <FilterField label={t.technologies}><TextFilter name="tech" defaultValue={filters.technologies?.join(", ")} placeholder="WordPress, Shopify" /></FilterField>
          <FilterField label={t.keywords}><TextFilter name="keywords" defaultValue={filters.keywords?.join(", ")} /></FilterField>
          <FilterField label={`${t.founded} ${t.foundedAfter}`}><TextFilter name="foundedAfter" type="number" defaultValue={filters.foundedAfter} /></FilterField>
          <FilterField label={`${t.founded} ${t.foundedBefore}`}><TextFilter name="foundedBefore" type="number" defaultValue={filters.foundedBefore} /></FilterField>
          <FilterField label={t.model}><SelectFilter name="model" defaultValue={filters.businessModel} anyLabel={s.any} options={(["b2b", "b2c", "both"] as const).map((v) => ({ value: v, label: t.models[v] }))} /></FilterField>
          <FilterField label={t.type}><SelectFilter name="type" defaultValue={filters.companyType} anyLabel={s.any} options={(Object.keys(t.types) as (keyof typeof t.types)[]).map((v) => ({ value: v, label: t.types[v] }))} /></FilterField>
          <FilterField label={t.language}><TextFilter name="language" defaultValue={filters.language} placeholder="cs, en, de" /></FilterField>
          <FilterField label={t.signals}><SelectFilter name="signals" defaultValue={filters.signals?.[0]} anyLabel={s.any} options={SIGNAL_TYPES.map((v) => ({ value: v, label: t.signalTypes[v] }))} /></FilterField>
          <FilterField label={dict.sourcing.talent.status}><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={COMPANY_STATUSES.map((v) => ({ value: v, label: t.statuses[v] }))} /></FilterField>
          <FilterField label={dict.sourcing.talent.minScore}><TextFilter name="minScore" type="number" defaultValue={filters.minScore} /></FilterField>
          <FilterField label={dict.sourcing.talent.tags}><TextFilter name="tags" defaultValue={filters.tags?.join(", ")} /></FilterField>
          <FilterField label={dict.sourcing.review.inCrm}><SelectFilter name="crm" defaultValue={filters.inCrm === undefined ? undefined : filters.inCrm ? "1" : "0"} anyLabel={s.any} options={[{ value: "1", label: s.yes }, { value: "0", label: s.no }]} /></FilterField>
        </div>
      </details>
    </form>
  );
}

function hasMoreFilters(f: CompanyFilters): boolean {
  const { q: _q, country: _c, industry: _i, sizeBucket: _s, ...rest } = f;
  void _q; void _c; void _i; void _s;
  return Object.keys(rest).length > 0;
}
