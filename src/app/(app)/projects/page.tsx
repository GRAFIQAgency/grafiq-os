import { ModulePlaceholder } from "@/components/shared/module-placeholder";
import { moduleMetadata } from "@/lib/i18n/metadata";

export const generateMetadata = moduleMetadata("projects");

export default function ProjectsPage() {
  return <ModulePlaceholder moduleId="projects" />;
}
