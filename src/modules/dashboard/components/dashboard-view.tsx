import type { Dictionary, Locale } from "@/lib/i18n/config";

import { dashboardHrefs } from "../queries";
import { toActivityFeed } from "../services/activity";
import type { DashboardData, Loaded } from "../types";
import type { ActivityFeedItem } from "../services/activity";
import { ActivityCard } from "./activity-card";
import { CompanyPulse } from "./company-pulse";
import { HealthStrip } from "./health-strip";
import { CapacityCard, FinanceCard, ProfitabilityCard, ProjectsCard, QaCard, SalesCard } from "./module-cards";
import { NeedsAttention } from "./needs-attention";
import { QuickActions } from "./quick-actions";
import { TimelineCard } from "./timeline-card";

/**
 * Layout. On mobile the order is problems first (attention → today → pulse);
 * on desktop the pulse and health lead and the module cards sit side by side.
 */
export function DashboardView({ data, dict, locale }: { data: DashboardData; dict: Dictionary; locale: Locale }) {
  const hrefs = dashboardHrefs();
  const activity: Loaded<ActivityFeedItem[]> = data.activity.state === "error"
    ? { state: "error", data: null }
    : { state: data.activity.state, data: toActivityFeed(data.activity.data ?? [], { project: hrefs.project, company: hrefs.company, talent: hrefs.talentPerson }) };

  return (
    <div className="flex flex-col gap-6">
      <div className="order-1 lg:order-3"><NeedsAttention items={data.attention} dict={dict} locale={locale} /></div>
      <div className="order-2 lg:order-4"><TimelineCard timeline={data.timeline} dict={dict} locale={locale} /></div>
      <div className="order-3 lg:order-1" data-guide="dashboard-stats"><CompanyPulse data={data} dict={dict} locale={locale} /></div>
      <div className="order-4 lg:order-2"><HealthStrip areas={data.health} dict={dict} /></div>

      <div className="order-5 lg:order-5"><ProjectsCard loaded={data.projects} href={hrefs.projects} projectHref={hrefs.project} dict={dict} locale={locale} /></div>
      <div className="order-6 lg:order-6"><FinanceCard loaded={data.finance} href={hrefs.finance} cashflowHref={hrefs.cashflow} dict={dict} locale={locale} /></div>
      <div className="order-7 lg:order-7"><ProfitabilityCard loaded={data.finance} href={hrefs.profitability} projectFinancialsHref={hrefs.projectFinancials} dict={dict} locale={locale} /></div>

      <div className="order-8 grid grid-cols-1 gap-6 lg:order-8 lg:grid-cols-2">
        <CapacityCard loaded={data.capacity} href={hrefs.capacity} talentHref={hrefs.talent} personHref={hrefs.capacityPerson} dict={dict} locale={locale} />
        <QaCard loaded={data.qa} items={data.qaItems} href={hrefs.qa} checklistHref={hrefs.checklist} dict={dict} />
      </div>

      <div className="order-9 grid grid-cols-1 gap-6 lg:order-9 lg:grid-cols-2">
        <SalesCard loaded={data.sales} overdueCount={data.salesAttentionCount} href={hrefs.sales} dict={dict} locale={locale} />
        <ActivityCard loaded={activity} dict={dict} locale={locale} />
      </div>

      <div className="order-10 lg:order-10"><QuickActions dict={dict} /></div>
    </div>
  );
}
