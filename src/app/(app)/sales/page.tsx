import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { interpolate } from "@/lib/i18n/interpolate";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { AddCompanySheet } from "@/modules/sales/components/add-company-sheet";
import { DealFiltersForm } from "@/modules/sales/components/deal-filters";
import { DealsEmpty, DealsTable } from "@/modules/sales/components/deals-table";
import { PipelineBoard } from "@/modules/sales/components/pipeline-board";
import { PipelineStatsStrip } from "@/modules/sales/components/pipeline-stats";
import { getPipelineStats, getSalesPickers, listDeals } from "@/modules/sales/queries";
import { parseDealFilters, parseDealSort, parsePipelineView } from "@/modules/sales/services/filters";

export const generateMetadata = moduleMetadata("sales");

export default async function SalesPage({ searchParams }: PageProps<"/sales">) {
  const params = await searchParams;
  const filters = parseDealFilters(params);
  const sort = parseDealSort(params);
  const view = parsePipelineView(params);
  const boardFilters = view === "board" ? { ...filters, includeClosed: true } : filters;
  const [dict, locale, deals, stats, pickers] = await Promise.all([getDictionary(), getLocale(), listDeals(boardFilters, sort), getPipelineStats(), getSalesPickers()]);
  const filtered = Object.keys(filters).length > 0;

  return (
    <div className="space-y-6">
      <PageHeader title={dict.sales.title} description={dict.sales.description} actions={<AddCompanySheet />} />
      <PipelineStatsStrip stats={stats} dict={dict} locale={locale} />
      <DealFiltersForm filters={filters} sort={sort} view={view} pickers={pickers} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(dict.sales.count, { n: deals.length })}</p>
      {deals.length === 0 ? <DealsEmpty dict={dict} filtered={filtered} /> : view === "board" ? (
        <PipelineBoard deals={deals} dict={dict} locale={locale} />
      ) : (
        <DealsTable deals={deals} dict={dict} locale={locale} />
      )}
    </div>
  );
}
