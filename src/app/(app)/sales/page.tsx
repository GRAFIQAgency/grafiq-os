import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("sales");

export default function SalesPage() {
  return <ModulePlaceholder moduleId="sales" />;
}
