import { getModule } from "@/config/modules";
import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import type { Dictionary } from "@/lib/i18n/config";
import { TALENT_ROLES } from "@/modules/sourcing/constants";

import { BENCH_STATUSES, ENGAGEMENT_TYPES, TALENT_SORTS } from "../constants";
import type { TalentFilters, TalentSort } from "../types";

export function TalentFiltersForm({ filters, sort, dict }: { filters: TalentFilters; sort: TalentSort; dict: Dictionary }) {
  const t = dict.talent;
  const s = dict.sourcing.search;
  const base = getModule("talent").href;

  return (
    <form method="get" action={base} className="space-y-3 rounded-lg border bg-card p-4" data-guide="talent-filters">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1">
          <TextFilter name="q" defaultValue={filters.q} placeholder={t.filters.search} />
        </FilterField>
        <FilterField label={t.filters.role} className="md:w-52">
          <SelectFilter name="role" defaultValue={filters.role} anyLabel={s.any} options={TALENT_ROLES.map((r) => ({ value: r, label: r }))} />
        </FilterField>
        <FilterField label={t.filters.availability} className="md:w-40">
          <SelectFilter name="availability" defaultValue={filters.availability} anyLabel={s.any} options={(["available", "limited", "unavailable", "unknown"] as const).map((v) => ({ value: v, label: t.availabilities[v] }))} />
        </FilterField>
        <FilterField label={t.sort} className="md:w-44">
          <SelectFilter name="sort" defaultValue={sort} anyLabel={t.sorts.quality} allowAny={false} options={TALENT_SORTS.map((v) => ({ value: v, label: t.sorts[v] }))} />
        </FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={base} />
      </div>
      <details open={hasMore(filters)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <FilterField label={t.filters.skills}><TextFilter name="skills" defaultValue={filters.skills?.join(", ")} placeholder="Webflow, GSAP" /></FilterField>
          <FilterField label={t.filters.seniority}><SelectFilter name="seniority" defaultValue={filters.seniority} anyLabel={s.any} options={(["junior", "mid", "senior", "lead"] as const).map((v) => ({ value: v, label: dict.sourcing.talent.seniorities[v] }))} /></FilterField>
          <FilterField label={t.filters.country}><TextFilter name="country" defaultValue={filters.country} /></FilterField>
          <FilterField label={t.filters.engagement}><SelectFilter name="engagement" defaultValue={filters.engagementType} anyLabel={s.any} options={ENGAGEMENT_TYPES.map((v) => ({ value: v, label: t.engagements[v] }))} /></FilterField>
          <FilterField label={t.filters.status}><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={BENCH_STATUSES.map((v) => ({ value: v, label: t.statuses[v] }))} /></FilterField>
          <FilterField label={t.filters.preferredOnly}><SelectFilter name="preferred" defaultValue={filters.preferredOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.filters.rateMin}><TextFilter name="rateMin" type="number" defaultValue={filters.rateMin} /></FilterField>
          <FilterField label={t.filters.rateMax}><TextFilter name="rateMax" type="number" defaultValue={filters.rateMax} /></FilterField>
        </div>
      </details>
    </form>
  );
}

function hasMore(f: TalentFilters) {
  const { q: _q, role: _r, availability: _a, ...rest } = f;
  void _q; void _r; void _a;
  return Object.keys(rest).length > 0;
}
