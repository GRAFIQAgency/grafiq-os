import { notFound } from "next/navigation";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { ProjectDetailView } from "@/modules/projects/components/project-detail";
import type { ProjectTab } from "@/modules/projects/components/project-tabs";
import { getProjectDetail, getProjectPickers } from "@/modules/projects/queries";

const TABS: ProjectTab[] = ["overview", "work", "team", "financials", "activity"];

export async function generateMetadata({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  return { title: detail?.project.name ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.includes(sp.tab as ProjectTab) ? (sp.tab as ProjectTab) : "overview";
  const view = sp.view === "board" ? "board" : "list";
  const [detail, pickers, dict, locale] = await Promise.all([getProjectDetail(id), getProjectPickers(), getDictionary(), getLocale()]);
  if (!detail) notFound();

  return <ProjectDetailView detail={detail} tab={tab} view={view} pickers={pickers} dict={dict} locale={locale} />;
}
