import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { PricingCalculator } from "@/modules/pricing/components/pricing-calculator";
import { RecentEstimates } from "@/modules/pricing/components/recent-estimates";
import { estimateFromRows } from "@/modules/pricing/mappers";
import { getEstimate, listRecentEstimates } from "@/modules/pricing/queries";

export const generateMetadata = moduleMetadata("pricing");

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const params = await searchParams;
  const estimateId = typeof params.estimate === "string" ? params.estimate : undefined;

  const [saved, recent, dict] = await Promise.all([
    estimateId ? getEstimate(estimateId) : Promise.resolve(null),
    listRecentEstimates(),
    getDictionary(),
  ]);
  const initialEstimate = saved ? estimateFromRows(saved) : undefined;

  return (
    <div className="space-y-8">
      <PageHeader title={dict.modules.pricing.title} description={dict.modules.pricing.description} />
      {/* key resets the calculator state when switching between estimates */}
      <PricingCalculator key={initialEstimate?.id ?? "new"} initialEstimate={initialEstimate} />
      <RecentEstimates items={recent} activeId={initialEstimate?.id} />
    </div>
  );
}
