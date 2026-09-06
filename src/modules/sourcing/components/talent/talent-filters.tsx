import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";

import { TALENT_ROLES, TALENT_STATUSES, TECHNOLOGIES } from "../../constants";
import type { TalentFilters } from "../../types";
import { FilterActions, FilterField, SelectFilter, TextFilter } from "../shared/filter-form";

export function TalentFiltersForm({ filters, dict }: { filters: TalentFilters; dict: Dictionary }) {
  const t = dict.sourcing.talent;
  const s = dict.sourcing.search;
  const base = `${getModule("sourcing").href}/talent`;
  const yesNo = [{ value: "1", label: s.yes }, { value: "0", label: s.no }];

  return (
    <form method="get" action={base} className="space-y-4 rounded-lg border bg-card p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1">
          <TextFilter name="q" defaultValue={filters.q} placeholder={s.searchPlaceholder} />
        </FilterField>
        <FilterField label={t.role} className="md:w-56">
          <SelectFilter name="role" defaultValue={filters.role} anyLabel={s.any} options={TALENT_ROLES.map((r) => ({ value: r, label: r }))} />
        </FilterField>
        <FilterField label={t.seniority} className="md:w-40">
          <SelectFilter name="seniority" defaultValue={filters.seniority} anyLabel={s.any} options={(["junior", "mid", "senior", "lead"] as const).map((v) => ({ value: v, label: t.seniorities[v] }))} />
        </FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={base} />
      </div>

      <details className="group" open={hasMoreFilters(filters)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
          <FilterField label={t.skills}><TextFilter name="skills" defaultValue={filters.skills?.join(", ")} placeholder="Webflow, GSAP" /></FilterField>
          <FilterField label={t.technologies}><TextFilter name="tech" defaultValue={filters.technologies?.join(", ")} placeholder={TECHNOLOGIES.slice(0, 3).join(", ")} /></FilterField>
          <FilterField label={t.country}><TextFilter name="country" defaultValue={filters.country} /></FilterField>
          <FilterField label={t.city}><TextFilter name="city" defaultValue={filters.city} /></FilterField>
          <FilterField label={t.remote}><SelectFilter name="remote" defaultValue={filters.remote === undefined ? undefined : filters.remote ? "1" : "0"} anyLabel={s.any} options={yesNo} /></FilterField>
          <FilterField label={t.employment}><SelectFilter name="employment" defaultValue={filters.employmentType} anyLabel={s.any} options={(["freelancer", "contractor", "employee"] as const).map((v) => ({ value: v, label: t.employments[v] }))} /></FilterField>
          <FilterField label={`${t.rate} ${t.rateMin}`}><TextFilter name="rateMin" type="number" defaultValue={filters.rateMin} /></FilterField>
          <FilterField label={`${t.rate} ${t.rateMax}`}><TextFilter name="rateMax" type="number" defaultValue={filters.rateMax} /></FilterField>
          <FilterField label={t.availability}><SelectFilter name="availability" defaultValue={filters.availability} anyLabel={s.any} options={(["available", "limited", "unavailable", "unknown"] as const).map((v) => ({ value: v, label: t.availabilities[v] }))} /></FilterField>
          <FilterField label={t.languages}><TextFilter name="languages" defaultValue={filters.languages?.join(", ")} placeholder="English, Czech" /></FilterField>
          <FilterField label={t.minYears}><TextFilter name="minYears" type="number" defaultValue={filters.minYears} /></FilterField>
          <FilterField label={t.hasPortfolio}><SelectFilter name="portfolio" defaultValue={filters.hasPortfolio ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.agency}><SelectFilter name="agency" defaultValue={filters.agencyExperience === undefined ? undefined : filters.agencyExperience ? "1" : "0"} anyLabel={s.any} options={yesNo} /></FilterField>
          <FilterField label={t.status}><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={TALENT_STATUSES.map((v) => ({ value: v, label: t.statuses[v] }))} /></FilterField>
          <FilterField label={t.minScore}><TextFilter name="minScore" type="number" defaultValue={filters.minScore} /></FilterField>
          <FilterField label={t.tags}><TextFilter name="tags" defaultValue={filters.tags?.join(", ")} /></FilterField>
          <FilterField label={dict.sourcing.review.inBench}><SelectFilter name="bench" defaultValue={filters.inBench === undefined ? undefined : filters.inBench ? "1" : "0"} anyLabel={s.any} options={yesNo} /></FilterField>
        </div>
      </details>
    </form>
  );
}

function hasMoreFilters(f: TalentFilters): boolean {
  const { q: _q, role: _r, seniority: _s, ...rest } = f;
  void _q; void _r; void _s;
  return Object.keys(rest).length > 0;
}
