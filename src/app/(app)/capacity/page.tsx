import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Capacity" };

export default function CapacityPage() {
  return <ModulePlaceholder moduleId="capacity" />;
}
