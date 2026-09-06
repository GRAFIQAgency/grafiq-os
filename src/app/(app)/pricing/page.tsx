import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { getModule } from "@/config/modules";
import { PricingCalculator } from "@/modules/pricing/components/pricing-calculator";
import { RecentEstimates } from "@/modules/pricing/components/recent-estimates";
import { estimateFromRows } from "@/modules/pricing/mappers";
import { getEstimate, listRecentEstimates } from "@/modules/pricing/queries";

export const metadata: Metadata = { title: "Pricing" };

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const params = await searchParams;
  const estimateId = typeof params.estimate === "string" ? params.estimate : undefined;

  const [saved, recent] = await Promise.all([
    estimateId ? getEstimate(estimateId) : Promise.resolve(null),
    listRecentEstimates(),
  ]);
  const initialEstimate = saved ? estimateFromRows(saved) : undefined;
  const mod = getModule("pricing");

  return (
    <div className="space-y-8">
      <PageHeader title={mod.title} description={mod.description} />
      {/* key resets the calculator state when switching between estimates */}
      <PricingCalculator key={initialEstimate?.id ?? "new"} initialEstimate={initialEstimate} />
      <RecentEstimates items={recent} activeId={initialEstimate?.id} />
    </div>
  );
}
