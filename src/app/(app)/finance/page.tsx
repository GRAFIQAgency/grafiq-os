import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("finance");

export default function FinancePage() {
  return <ModulePlaceholder moduleId="finance" />;
}
