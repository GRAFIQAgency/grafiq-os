import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { OverviewWidgets, QuickStart, RecentRuns } from "@/modules/sourcing/components/overview/overview-widgets";
import { getOverviewStats } from "@/modules/sourcing/queries/overview";
import { listRecentRuns } from "@/modules/sourcing/queries/searches";

export const generateMetadata = moduleMetadata("sourcing");

export default async function SourcingOverviewPage() {
  const [dict, locale, stats, runs] = await Promise.all([getDictionary(), getLocale(), getOverviewStats(), listRecentRuns()]);
  return (
    <div className="space-y-6" data-guide="sourcing-overview">
      <QuickStart dict={dict} />
      <OverviewWidgets stats={stats} dict={dict} />
      <RecentRuns runs={runs} dict={dict} locale={locale} />
    </div>
  );
}
