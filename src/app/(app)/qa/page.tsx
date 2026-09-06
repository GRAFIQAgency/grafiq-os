import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "QA" };

export default function QAPage() {
  return <ModulePlaceholder moduleId="qa" />;
}
