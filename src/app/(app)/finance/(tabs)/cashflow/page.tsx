import { DetailSection } from "@/components/shared/detail-section";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { isoToday } from "@/modules/finance/calculations/dates";
import { AccountsPanel } from "@/modules/finance/components/accounts-panel";
import { CashForecastView } from "@/modules/finance/components/cash-forecast";
import { CashLedger } from "@/modules/finance/components/cash-ledger";
import { RiskList } from "@/modules/finance/components/risk-list";
import { DEFAULT_HORIZON, FORECAST_HORIZONS } from "@/modules/finance/constants";
import { financeHrefs, getCashForecast, getFinanceAlerts, getFinancePickers, listAccounts, listCashPositions, listRecentCashActivity } from "@/modules/finance/queries";

export const generateMetadata = moduleMetadata("finance");

export default async function CashFlowPage({ searchParams }: PageProps<"/finance/cashflow">) {
  const params = await searchParams;
  const months = FORECAST_HORIZONS.find((h) => String(h) === params.months) ?? DEFAULT_HORIZON;
  const [dict, locale, forecasts, positions, accounts, events, risks, pickers] = await Promise.all([
    getDictionary(), getLocale(), getCashForecast(months), listCashPositions(), listAccounts(), listRecentCashActivity(), getFinanceAlerts(), getFinancePickers(),
  ]);
  const today = isoToday();
  const cashRisks = risks.filter((r) => r.code === "cash_below_zero" || r.code === "payable_before_receivable" || r.code === "stale_balance" || r.code === "no_accounts");
  return (
    <div className="space-y-6">
      <AccountsPanel accounts={accounts} positions={positions} defaultCurrency={pickers.settings.defaultCurrency} today={today} />
      <DetailSection title={dict.finance.forecast.title}>
        <CashForecastView forecasts={forecasts} horizon={months} hrefBase={financeHrefs().cashflow} dict={dict} locale={locale} />
      </DetailSection>
      {cashRisks.length ? <DetailSection title={dict.finance.overview.risksTitle}><RiskList risks={cashRisks} dict={dict} locale={locale} /></DetailSection> : null}
      <CashLedger events={events} accounts={accounts} defaultCurrency={pickers.settings.defaultCurrency} today={today} />
    </div>
  );
}
