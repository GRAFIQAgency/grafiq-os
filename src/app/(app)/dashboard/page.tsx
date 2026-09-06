import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { PlaceholderBadge } from "@/components/shared/placeholder-badge";
import { getModule } from "@/config/modules";
import { DashboardOverview } from "@/modules/dashboard/components/dashboard-overview";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  const mod = getModule("dashboard");

  return (
    <div className="space-y-8">
      <PageHeader
        title={mod.title}
        description={mod.description}
        actions={<PlaceholderBadge label="Example data" />}
      />
      <DashboardOverview />
    </div>
  );
}
