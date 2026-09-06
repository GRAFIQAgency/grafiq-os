import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("qa");

export default function QAPage() {
  return <ModulePlaceholder moduleId="qa" />;
}
