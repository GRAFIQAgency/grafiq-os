import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("talent");

export default function TalentPage() {
  return <ModulePlaceholder moduleId="talent" />;
}
