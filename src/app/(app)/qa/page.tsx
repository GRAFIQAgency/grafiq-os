import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { matchesFilters, qaStats } from "@/modules/qa/calculations/stats";
import { QaFiltersForm } from "@/modules/qa/components/qa-filters";
import { QaOverview } from "@/modules/qa/components/qa-overview";
import { QaTabs, type QaTab } from "@/modules/qa/components/qa-tabs";
import { TemplatesList } from "@/modules/qa/components/templates-list";
import { listChecklistOverview, listReviewers, listTemplateSummaries } from "@/modules/qa/queries";
import { parseQaFilters } from "@/modules/qa/services/filters";

export const generateMetadata = moduleMetadata("qa");

export default async function QaPage({ searchParams }: PageProps<"/qa">) {
  const params = await searchParams;
  const tab: QaTab = params.tab === "templates" ? "templates" : "projects";
  const dict = await getDictionary();

  if (tab === "templates") {
    const templates = await listTemplateSummaries();
    return (
      <div className="space-y-6">
        <PageHeader title={dict.qa.title} description={dict.qa.description} />
        <QaTabs current={tab} dict={dict} />
        <TemplatesList templates={templates} dict={dict} />
      </div>
    );
  }

  const filters = parseQaFilters(params);
  const [locale, all, reviewers] = await Promise.all([getLocale(), listChecklistOverview(), listReviewers()]);
  const visible = all.filter((c) => matchesFilters(c, filters));
  const stats = qaStats(all, new Date().toISOString().slice(0, 10));
  const projects = [...new Map(all.map((c) => [c.projectId, { id: c.projectId, name: c.projectName }])).values()].sort((a, b) => a.name.localeCompare(b.name));
  const t = dict.qa.stats;

  return (
    <div className="space-y-6">
      <PageHeader title={dict.qa.title} description={dict.qa.description} />
      <QaTabs current={tab} dict={dict} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" data-guide="qa-stats">
        {[
          { label: t.projects, value: stats.projectsWithQa },
          { label: t.needsFixes, value: stats.needsFixes, warn: stats.needsFixes > 0 },
          { label: t.overdue, value: stats.overdue, warn: stats.overdue > 0 },
          { label: t.readyForReview, value: stats.readyForReview },
          { label: t.inProgress, value: stats.inProgress },
          { label: t.approvedThisMonth, value: stats.approvedThisMonth },
        ].map((i) => (
          <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{i.label}</p>
            <p className={`mt-1 text-lg font-semibold tabular-nums ${i.warn ? "text-red-400" : ""}`}>{i.value}</p>
          </div>
        ))}
      </div>
      <QaFiltersForm filters={filters} projects={projects} reviewers={reviewers} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(dict.qa.overview.count, { n: visible.length, total: all.length })}</p>
      <QaOverview checklists={visible} filtered={Object.keys(filters).length > 0} dict={dict} locale={locale} />
    </div>
  );
}
