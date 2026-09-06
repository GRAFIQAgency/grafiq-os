import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Pricing" };

export default function PricingPage() {
  return <ModulePlaceholder moduleId="pricing" />;
}
