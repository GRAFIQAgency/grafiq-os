import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { matchesProfitabilityFilters } from "@/modules/finance/calculations/portfolio";
import { ProfitabilityFiltersForm, ProfitabilityTable } from "@/modules/finance/components/profitability-table";
import { financeHrefs, getFinancePickers, getPortfolioProfitability, listProjectProfitability } from "@/modules/finance/queries";
import { parseProfitabilityFilters } from "@/modules/finance/services/filters";

export const generateMetadata = moduleMetadata("finance");

export default async function ProfitabilityPage({ searchParams }: PageProps<"/finance/profitability">) {
  const params = await searchParams;
  const filters = parseProfitabilityFilters(params);
  const [dict, locale, all, pickers] = await Promise.all([getDictionary(), getLocale(), listProjectProfitability(), getFinancePickers()]);
  const visible = all.filter((p) => matchesProfitabilityFilters(p, filters));
  const totals = await getPortfolioProfitability("forecast", visible);
  const t = dict.finance.profitability;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.description}</p>
      <ProfitabilityFiltersForm filters={filters} clients={pickers.clients} action={financeHrefs().profitability} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(t.count, { n: visible.length })}</p>
      <ProfitabilityTable items={visible} totals={totals} dict={dict} locale={locale} />
    </div>
  );
}
