import { CURRENCIES } from "@/config/currencies";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { formatMoney } from "@/lib/format";
import { isoToday } from "@/modules/finance/calculations/dates";
import { matchesItemFilters, payablesSummary } from "@/modules/finance/calculations/overview";
import { ItemFiltersForm } from "@/modules/finance/components/item-filters";
import { PayablesList } from "@/modules/finance/components/payables-list";
import { StatCard } from "@/modules/finance/components/stat-card";
import { financeHrefs, getFinancePickers, listPayableViews } from "@/modules/finance/queries";
import { parseItemFilters } from "@/modules/finance/services/filters";

export const generateMetadata = moduleMetadata("finance");

export default async function PayablesPage({ searchParams }: PageProps<"/finance/payables">) {
  const params = await searchParams;
  const filters = parseItemFilters(params, "payable");
  const [dict, locale, all, pickers] = await Promise.all([getDictionary(), getLocale(), listPayableViews(), getFinancePickers()]);
  const t = dict.finance.payables;
  const visible = all.filter((p) => matchesItemFilters(p, filters));
  const summary = payablesSummary(all, CURRENCIES).byCurrency;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">{t.description}</p>
      {Object.keys(summary).length ? (
        <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
          {Object.entries(summary).map(([currency, s]) => (
            <StatCard key={`${currency}-o`} label={`${t.summary.outstanding} · ${currency}`} value={formatMoney(s.outstanding, currency as "CZK", locale)} hint={`${s.openCount}`} />
          ))}
          {Object.entries(summary).map(([currency, s]) => (
            <StatCard key={`${currency}-d`} label={`${t.summary.overdue} · ${currency}`} value={formatMoney(s.overdue, currency as "CZK", locale)} tone={s.overdue > 0 ? "risk" : "default"} hint={`${s.overdueCount}`} />
          ))}
        </div>
      ) : null}
      <ItemFiltersForm kind="payable" filters={filters} pickers={pickers} action={financeHrefs().payables} dict={dict} />
      <PayablesList items={visible} pickers={pickers} today={isoToday()} filtered={Object.keys(filters).length > 0} />
    </div>
  );
}
