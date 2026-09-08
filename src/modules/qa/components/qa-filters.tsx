import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";
import { PROJECT_TYPES } from "@/modules/projects/constants";

import { CHECKLIST_STATUSES } from "../constants";
import type { QaFilters } from "../types";

export function QaFiltersForm({ filters, projects, reviewers, dict }: { filters: QaFilters; projects: { id: string; name: string }[]; reviewers: { id: string; label: string }[]; dict: Dictionary }) {
  const t = dict.qa.filters;
  const s = dict.sourcing.search;
  const base = getModule("qa").href;
  const types = dict.projects.types as Record<string, string>;
  const more = Boolean(filters.failedOnly || filters.awaitingReview || filters.approvedOnly || filters.overdueOnly || filters.projectType || filters.reviewerId);
  return (
    <form method="get" action={base} className="space-y-3 rounded-lg border bg-card p-4" data-guide="qa-filters">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1"><TextFilter name="q" defaultValue={filters.q} placeholder={t.search} /></FilterField>
        <FilterField label={t.status} className="md:w-44"><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={CHECKLIST_STATUSES.map((v) => ({ value: v, label: dict.qa.statuses[v] }))} /></FilterField>
        <FilterField label={t.project} className="md:w-52"><SelectFilter name="project" defaultValue={filters.projectId} anyLabel={s.any} options={projects.map((p) => ({ value: p.id, label: p.name }))} /></FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={base} />
      </div>
      <details open={more}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label={t.type}><SelectFilter name="type" defaultValue={filters.projectType} anyLabel={s.any} options={PROJECT_TYPES.map((v) => ({ value: v, label: types[v] ?? v }))} /></FilterField>
          <FilterField label={t.reviewer}><SelectFilter name="reviewer" defaultValue={filters.reviewerId} anyLabel={s.any} options={reviewers.map((r) => ({ value: r.id, label: r.label }))} /></FilterField>
          <FilterField label={t.failedOnly}><SelectFilter name="failed" defaultValue={filters.failedOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.awaitingReview}><SelectFilter name="review" defaultValue={filters.awaitingReview ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.approvedOnly}><SelectFilter name="approved" defaultValue={filters.approvedOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.overdueOnly}><SelectFilter name="overdue" defaultValue={filters.overdueOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
        </div>
      </details>
    </form>
  );
}
