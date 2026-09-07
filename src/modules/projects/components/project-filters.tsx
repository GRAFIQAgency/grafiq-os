import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";

import { PRIORITIES, PROJECT_SORTS, PROJECT_STATUSES, PROJECT_TYPES } from "../constants";
import type { PickerOption, ProjectFilters, ProjectSort } from "../types";

export function ProjectFiltersForm({ filters, sort, clients, owners, dict }: { filters: ProjectFilters; sort: ProjectSort; clients: PickerOption[]; owners: PickerOption[]; dict: Dictionary }) {
  const t = dict.projects.list;
  const s = dict.sourcing.search;
  const base = getModule("projects").href;
  return (
    <form method="get" action={base} className="space-y-3 rounded-lg border bg-card p-4" data-guide="projects-filters">
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1"><TextFilter name="q" defaultValue={filters.q} placeholder={t.filters.search} /></FilterField>
        <FilterField label={t.filters.status} className="md:w-44"><SelectFilter name="status" defaultValue={filters.status} anyLabel={s.any} options={PROJECT_STATUSES.map((v) => ({ value: v, label: dict.projects.statuses[v] }))} /></FilterField>
        <FilterField label={t.filters.health} className="md:w-36"><SelectFilter name="health" defaultValue={filters.health} anyLabel={s.any} options={(["healthy", "attention", "at_risk", "critical"] as const).map((v) => ({ value: v, label: dict.projects.health[v] }))} /></FilterField>
        <FilterField label={t.filters.sort} className="md:w-40"><SelectFilter name="sort" defaultValue={sort} anyLabel={t.sorts.deadline} allowAny={false} options={PROJECT_SORTS.map((v) => ({ value: v, label: t.sorts[v] }))} /></FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={base} />
      </div>
      <details open={Boolean(filters.clientId || filters.ownerId || filters.projectType || filters.priority || filters.deadlineBefore || filters.includeArchived)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <FilterField label={t.filters.client}><SelectFilter name="client" defaultValue={filters.clientId} anyLabel={s.any} options={clients.map((c) => ({ value: c.id, label: c.label }))} /></FilterField>
          <FilterField label={t.filters.owner}><SelectFilter name="owner" defaultValue={filters.ownerId} anyLabel={s.any} options={owners.map((o) => ({ value: o.id, label: o.label }))} /></FilterField>
          <FilterField label={t.filters.type}><SelectFilter name="type" defaultValue={filters.projectType} anyLabel={s.any} options={PROJECT_TYPES.map((v) => ({ value: v, label: dict.projects.types[v] }))} /></FilterField>
          <FilterField label={t.filters.priority}><SelectFilter name="priority" defaultValue={filters.priority} anyLabel={s.any} options={PRIORITIES.map((v) => ({ value: v, label: dict.projects.priorities[v] }))} /></FilterField>
          <FilterField label={t.filters.deadlineBefore}><TextFilter name="deadlineBefore" type="date" defaultValue={filters.deadlineBefore} /></FilterField>
          <FilterField label={t.filters.archived}><SelectFilter name="archived" defaultValue={filters.includeArchived ? "1" : undefined} anyLabel={s.no} options={[{ value: "1", label: s.yes }]} /></FilterField>
        </div>
      </details>
    </form>
  );
}
