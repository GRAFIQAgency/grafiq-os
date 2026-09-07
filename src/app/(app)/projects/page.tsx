import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { interpolate } from "@/lib/i18n/interpolate";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary, getLocale } from "@/lib/i18n/server";
import { ProjectFiltersForm } from "@/modules/projects/components/project-filters";
import { ProjectsTable } from "@/modules/projects/components/projects-table";
import { getProjectPickers, listProjects } from "@/modules/projects/queries";
import { parseProjectFilters, parseProjectSort } from "@/modules/projects/services/filters";

export const generateMetadata = moduleMetadata("projects");

export default async function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  const params = await searchParams;
  const filters = parseProjectFilters(params);
  const sort = parseProjectSort(params);
  const [dict, locale, items, pickers] = await Promise.all([getDictionary(), getLocale(), listProjects(filters, sort), getProjectPickers()]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={dict.projects.title}
        description={dict.projects.description}
        actions={<Link href={`${getModule("projects").href}/new`} className={buttonVariants()} data-guide="projects-new"><Plus data-icon="inline-start" />{dict.projects.newProject}</Link>}
      />
      <ProjectFiltersForm filters={filters} sort={sort} clients={pickers.clients} owners={pickers.owners} dict={dict} />
      <p className="text-sm text-muted-foreground">{interpolate(dict.projects.list.count, { n: items.length })}</p>
      <ProjectsTable items={items} dict={dict} locale={locale} filtered={Object.keys(filters).length > 0} />
    </div>
  );
}
