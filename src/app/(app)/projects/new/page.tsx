import type { Metadata } from "next";

import { PageHeader } from "@/components/shared/page-header";
import { getDictionary } from "@/lib/i18n/server";
import { NewProjectForm } from "@/modules/projects/components/new-project-form";
import { getEstimatePrefill, getProjectPickers } from "@/modules/projects/queries";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.projects.create.title };
}

export default async function NewProjectPage({ searchParams }: PageProps<"/projects/new">) {
  const params = await searchParams;
  const estimateId = typeof params.estimate === "string" ? params.estimate : null;
  const [dict, pickers, prefill] = await Promise.all([getDictionary(), getProjectPickers(), estimateId ? getEstimatePrefill(estimateId) : Promise.resolve(null)]);

  return (
    <div className="space-y-6">
      <PageHeader title={dict.projects.create.title} description={dict.projects.create.baselineNote} />
      <NewProjectForm pickers={pickers} prefill={prefill} />
    </div>
  );
}
