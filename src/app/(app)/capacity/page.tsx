import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { allLoads, matchesFilters, planningMatrix, projectViews, sortLoads, summarize } from "@/modules/capacity/calculations/load";
import { parsePeriodKey, toDateString } from "@/modules/capacity/calculations/periods";
import { simulate } from "@/modules/capacity/calculations/whatif";
import { CapacityFiltersForm } from "@/modules/capacity/components/capacity-filters";
import { PeopleEmpty, PeopleTable } from "@/modules/capacity/components/people-table";
import { PeriodNav } from "@/modules/capacity/components/period-nav";
import { PlanningMatrix } from "@/modules/capacity/components/planning-matrix";
import { ProjectsView } from "@/modules/capacity/components/projects-view";
import { SummaryStrip } from "@/modules/capacity/components/summary-strip";
import { WhatIfPanel } from "@/modules/capacity/components/whatif-panel";
import { loadCapacityDataset } from "@/modules/capacity/queries";
import { parseCapacityFilters, parseHorizon, parsePeriodKind, parseView, parseWhatIf } from "@/modules/capacity/services/filters";
import { flattenParams } from "@/modules/capacity/services/links";

export const generateMetadata = moduleMetadata("capacity");

export default async function CapacityPage({ searchParams }: PageProps<"/capacity">) {
  const raw = await searchParams;
  const params = flattenParams(raw);
  const today = toDateString(new Date());
  const kind = parsePeriodKind(raw);
  const period = parsePeriodKey(params.period, kind, today);
  const filters = parseCapacityFilters({ ...raw, kind: raw.kind_person });
  const view = parseView(raw);
  const horizon = parseHorizon(raw);
  const whatIf = parseWhatIf(raw);

  const [dict, locale, data] = await Promise.all([getDictionary(), getLocale(), loadCapacityDataset()]);

  const loads = allLoads(data, period);
  const summary = summarize(loads);
  const visible = sortLoads(loads.filter((l) => matchesFilters(l, filters)));
  const filtered = Object.keys(filters).length > 0;
  const matrix = planningMatrix(data, period.start, horizon);
  const projects = [...new Map(data.assignments.map((a) => [a.projectId, { id: a.projectId, name: a.projectName }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const roles = [...new Set(data.people.map((p) => p.role).filter((r): r is string => Boolean(r)))].sort();
  const result = whatIf ? simulate(data, whatIf) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={dict.capacity.title} description={dict.capacity.description} />
      <PeriodNav period={period} params={params} dict={dict} locale={locale} />
      <SummaryStrip summary={summary} dict={dict} locale={locale} />
      <CapacityFiltersForm filters={filters} view={view} params={params} projects={projects} roles={roles} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(dict.capacity.count, { n: visible.length, total: loads.length })}</p>
      {view === "projects" ? (
        <ProjectsView views={projectViews(visible)} params={params} dict={dict} locale={locale} />
      ) : visible.length === 0 ? (
        <PeopleEmpty dict={dict} filtered={filtered} />
      ) : (
        <PeopleTable loads={visible} params={params} dict={dict} locale={locale} />
      )}
      <PlanningMatrix periods={matrix.periods} rows={matrix.rows.filter((r) => visible.some((l) => l.person.key === r.person.key))} horizon={horizon} params={params} dict={dict} locale={locale} />
      <WhatIfPanel people={data.people} roles={roles} result={result} params={params} defaults={{ start: period.start, end: period.end }} dict={dict} locale={locale} />
    </div>
  );
}
