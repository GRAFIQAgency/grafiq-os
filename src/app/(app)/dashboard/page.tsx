import { PageHeader } from "@/components/shared/page-header";
import { PlaceholderBadge } from "@/components/shared/placeholder-badge";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";

export const generateMetadata = moduleMetadata("dashboard");

export default async function DashboardPage() {
  const dict = await getDictionary();

  return (
    <div className="space-y-8">
      <PageHeader
        title={dict.modules.dashboard.title}
        description={dict.modules.dashboard.description}
        actions={<PlaceholderBadge label={dict.common.exampleData} />}
      />
      <DashboardOverview dict={dict} />
    </div>
  );
}
