import type { Metadata } from "next";

import { ModulePlaceholder } from "@/components/shared/module-placeholder";

export const metadata: Metadata = { title: "Talent" };

export default function TalentPage() {
  return <ModulePlaceholder moduleId="talent" />;
}
