import { PageHeader } from "@/components/shared/page-header";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { PricingCalculator } from "@/modules/pricing/components/pricing-calculator";
import { RecentEstimates } from "@/modules/pricing/components/recent-estimates";
import { estimateFromRows } from "@/modules/pricing/mappers";
import { getEstimate, getPricingDefaults, listRecentEstimates } from "@/modules/pricing/queries";
import { projectIdsByEstimate } from "@/modules/projects/queries";
import { getMarginThresholds } from "@/modules/settings/queries";

export const generateMetadata = moduleMetadata("pricing");

export default async function PricingPage({ searchParams }: PageProps<"/pricing">) {
  const params = await searchParams;
  const estimateId = typeof params.estimate === "string" ? params.estimate : undefined;

  const [saved, recent, dict, defaults, thresholds] = await Promise.all([
    estimateId ? getEstimate(estimateId) : Promise.resolve(null),
    listRecentEstimates(),
    getDictionary(),
    getPricingDefaults(),
    getMarginThresholds(),
  ]);
  const initialEstimate = saved ? estimateFromRows(saved) : undefined;
  const projectsByEstimate = await projectIdsByEstimate(recent.map((r) => r.id));

  return (
    <div className="space-y-8">
      <PageHeader title={dict.modules.pricing.title} description={dict.modules.pricing.description} />
      {/* key resets the calculator state when switching between estimates */}
      <PricingCalculator
        key={initialEstimate?.id ?? "new"}
        initialEstimate={initialEstimate}
        defaults={defaults}
        thresholds={thresholds}
      />
      <RecentEstimates items={recent} activeId={initialEstimate?.id} projectsByEstimate={projectsByEstimate} />
    </div>
  );
}
