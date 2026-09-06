import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("capacity");

export default function CapacityPage() {
  return <ModulePlaceholder moduleId="capacity" />;
}
