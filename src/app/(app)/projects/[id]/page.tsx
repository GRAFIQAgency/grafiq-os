import { notFound } from "next/navigation";

import { getDictionary, getLocale } from "@/lib/i18n/server";
import { ProjectPaymentsPanel } from "@/modules/finance/components/project-payments-panel";
import { ProjectDetailView } from "@/modules/projects/components/project-detail";
import type { ProjectTab } from "@/modules/projects/components/project-tabs";
import { getProjectDetail, getProjectPickers } from "@/modules/projects/queries";
import { ProjectQaSignal } from "@/modules/qa/components/project-qa-signal";
import { ProjectQaTab } from "@/modules/qa/components/project-qa-tab";
import { getProjectQaSummary } from "@/modules/qa/queries";

const TABS: ProjectTab[] = ["overview", "work", "team", "qa", "financials", "activity"];

export async function generateMetadata({ params }: PageProps<"/projects/[id]">) {
  const { id } = await params;
  const detail = await getProjectDetail(id);
  return { title: detail?.project.name ?? "Project" };
}

export default async function ProjectPage({ params, searchParams }: PageProps<"/projects/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const tab = TABS.includes(sp.tab as ProjectTab) ? (sp.tab as ProjectTab) : "overview";
  const view = sp.view === "board" ? "board" : "list";
  const [detail, pickers, dict, locale, qa] = await Promise.all([getProjectDetail(id), getProjectPickers(), getDictionary(), getLocale(), getProjectQaSummary(id)]);
  if (!detail) notFound();

  // QA and Finance are composed here (route level) so Projects never imports those modules.
  return (
    <ProjectDetailView
      detail={detail}
      tab={tab}
      view={view}
      pickers={pickers}
      dict={dict}
      locale={locale}
      qaSignal={<ProjectQaSignal summary={qa} dict={dict} locale={locale} />}
      qaCount={qa.failed + qa.blocked}
      qaTab={tab === "qa" ? <ProjectQaTab project={detail.project} members={detail.members} dict={dict} locale={locale} /> : null}
      paymentsPanel={tab === "financials" ? <ProjectPaymentsPanel projectId={detail.project.id} financials={detail.financials} dict={dict} locale={locale} /> : null}
    />
  );
}
