import { DetailSection } from "@/components/shared/detail-section";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { isoToday } from "@/modules/finance/calculations/dates";
import { PayablesList } from "@/modules/finance/components/payables-list";
import { RecurringCosts } from "@/modules/finance/components/recurring-costs";
import { getFinancePickers, listAccounts, listPayableViews, listRecurringCosts } from "@/modules/finance/queries";

export const generateMetadata = moduleMetadata("finance");

/** Company costs: recurring overheads + one-off company expenses (payables without a project). */
export default async function CostsPage() {
  const [dict, costs, accounts, payables, pickers] = await Promise.all([getDictionary(), listRecurringCosts(), listAccounts(), listPayableViews(), getFinancePickers()]);
  const t = dict.finance.recurring;
  const today = isoToday();
  return (
    <div className="space-y-6">
      <RecurringCosts costs={costs} accounts={accounts} defaultCurrency={pickers.settings.defaultCurrency} today={today} />
      <DetailSection title={t.oneOffTitle}>
        <p className="mb-3 text-xs text-muted-foreground">{t.oneOffHint}</p>
        <PayablesList items={payables.filter((p) => !p.projectId)} pickers={pickers} today={today} addLabel={t.oneOffAdd} />
      </DetailSection>
    </div>
  );
}
