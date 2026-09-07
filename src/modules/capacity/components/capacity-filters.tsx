import Link from "next/link";
import { FolderKanban, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { FilterActions, FilterField, SelectFilter, TextFilter } from "@/components/shared/filter-form";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import { capacityHref, type CapacityParams } from "../services/links";
import type { CapacityFilters, CapacityView } from "../types";

export function CapacityFiltersForm({ filters, view, params, projects, roles, dict }: {
  filters: CapacityFilters; view: CapacityView; params: CapacityParams; projects: { id: string; name: string }[]; roles: string[]; dict: Dictionary;
}) {
  const t = dict.capacity.filters;
  const s = dict.sourcing.search;
  const keep = { kind: params.kind, period: params.period, view: params.view, horizon: params.horizon };
  return (
    <form method="get" action={capacityHref({})} className="space-y-3 rounded-lg border bg-card p-4" data-guide="capacity-filters">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="flex flex-col gap-3 md:flex-row md:items-end">
        <FilterField label={dict.common.search} className="flex-1">
          <TextFilter name="q" defaultValue={filters.q} placeholder={t.search} />
        </FilterField>
        <FilterField label={t.role} className="md:w-44">
          <SelectFilter name="role" defaultValue={filters.role} anyLabel={s.any} options={roles.map((r) => ({ value: r, label: r }))} />
        </FilterField>
        <FilterField label={t.kind} className="md:w-36">
          <SelectFilter name="kind_person" defaultValue={filters.kind} anyLabel={s.any} options={[{ value: "talent", label: dict.capacity.kinds.talent }, { value: "user", label: dict.capacity.kinds.user }]} />
        </FilterField>
        <FilterField label={t.project} className="md:w-48">
          <SelectFilter name="project" defaultValue={filters.projectId} anyLabel={s.any} options={projects.map((p) => ({ value: p.id, label: p.name }))} />
        </FilterField>
        <FilterActions applyLabel={s.apply} clearLabel={s.clear} clearHref={capacityHref(keep)} />
        <div className="flex items-center gap-1 md:ml-auto" data-guide="capacity-view">
          {(["people", "projects"] as const).map((v) => (
            <Link key={v} href={capacityHref(params, { view: v === "projects" ? "projects" : undefined })} aria-current={view === v ? "page" : undefined} className={cn(buttonVariants({ size: "sm", variant: view === v ? "secondary" : "ghost" }))}>
              {v === "people" ? <Users data-icon="inline-start" /> : <FolderKanban data-icon="inline-start" />}{dict.capacity.views[v]}
            </Link>
          ))}
        </div>
      </div>
      <details open={Boolean(filters.overloadedOnly || filters.freeOnly || filters.availability)}>
        <summary className="cursor-pointer text-xs text-muted-foreground select-none">{s.moreFilters}</summary>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <FilterField label={t.overloadedOnly}><SelectFilter name="overloaded" defaultValue={filters.overloadedOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.freeOnly}><SelectFilter name="free" defaultValue={filters.freeOnly ? "1" : undefined} anyLabel={s.any} options={[{ value: "1", label: s.yes }]} /></FilterField>
          <FilterField label={t.availability}><SelectFilter name="availability" defaultValue={filters.availability} anyLabel={s.any} options={(["available", "limited", "unavailable", "unknown"] as const).map((v) => ({ value: v, label: dict.talent.availabilities[v] }))} /></FilterField>
        </div>
      </details>
    </form>
  );
}
