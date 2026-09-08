import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import type { Project, ProjectMember } from "@/modules/projects/types";
import { cn } from "@/lib/utils";

import { isOverdue, progressOf } from "../calculations/checklist";
import { recommendTemplate } from "../calculations/recommend";
import { summarizeProject } from "../calculations/stats";
import { listProjectChecklists, listReviewers, listTemplates } from "../queries";
import { NewChecklistForm } from "./new-checklist-form";
import { ChecklistStatusBadge, QaProgressBar } from "./qa-badges";

/** The QA tab inside a project: status, checklists, Start QA. Composed by the project route. */
export async function ProjectQaTab({ project, members, dict, locale }: { project: Project; members: ProjectMember[]; dict: Dictionary; locale: Locale }) {
  void members;
  const t = dict.qa.project;
  const [checklists, templates, reviewers] = await Promise.all([listProjectChecklists(project.id), listTemplates(), listReviewers()]);
  const today = new Date().toISOString().slice(0, 10);
  const rows = checklists.map((c) => ({ ...c, progress: progressOf(c.items), overdue: isOverdue(c.status, c.dueDate, today) }));
  const summary = summarizeProject(project.id, rows);
  const active = templates.filter((x) => x.isActive);
  const recommended = recommendTemplate(project.projectType, active);
  const base = getModule("qa").href;
  const templateOptions = active.map((x) => ({ id: x.id, name: x.name, itemCount: x.items.length, projectType: x.projectType }));

  return (
    <div className="space-y-6" data-guide="qa-project-tab">
      {rows.length === 0 ? (
        <div className="space-y-4 rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">{t.empty}</p>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{t.emptyHint}</p>
          <div className="mx-auto max-w-3xl text-left">
            <NewChecklistForm projectId={project.id} projectType={project.projectType} templates={templateOptions} recommendedId={recommended?.id ?? null} reviewers={reviewers} defaultDueDate={project.deadline} />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: t.status, value: summary.status ? dict.qa.statuses[summary.status] : "—", warn: summary.status === "needs_fixes" },
              { label: t.checklists, value: `${summary.approvedRequired}/${summary.requiredChecklists}`, hint: t.approvedRequiredHint },
              { label: dict.qa.itemStatuses.fail, value: String(summary.failed), warn: summary.failed > 0 },
              { label: dict.qa.itemStatuses.blocked, value: String(summary.blocked), warn: summary.blocked > 0 },
            ].map((i) => (
              <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
                <p className="text-xs text-muted-foreground">{i.label}</p>
                <p className={cn("mt-1 text-lg font-semibold tabular-nums", i.warn && "text-red-400")}>{i.value}</p>
                {i.hint ? <p className="text-[11px] text-muted-foreground">{i.hint}</p> : null}
              </div>
            ))}
          </div>
          {summary.blocksCompletion ? <p className="flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300"><AlertTriangle className="size-3.5" />{t.blocksCompletion}</p> : null}

          <DetailSection title={t.checklists} action={<NewChecklistForm projectId={project.id} projectType={project.projectType} templates={templateOptions} recommendedId={recommended?.id ?? null} reviewers={reviewers} defaultDueDate={project.deadline} compact />}>
            <ul className="divide-y divide-border/60">
              {rows.map((c) => (
                <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <Link href={`${base}/checklists/${c.id}`} className="font-medium hover:underline">{c.title}</Link>
                    <p className="text-xs text-muted-foreground">
                      {c.templateName} · {c.reviewerName ?? dict.qa.checklist.noReviewer}{c.dueDate ? ` · ${dict.qa.checklist.dueDate} ${formatDate(c.dueDate, locale)}` : ""}{!c.requiredForCompletion ? ` · ${dict.qa.checklist.optional}` : ""}
                      {c.overdue ? <span className="ml-2 text-red-400">{dict.qa.overview.overdue}</span> : null}
                    </p>
                    <div className="mt-1.5 flex max-w-sm items-center gap-2">
                      <QaProgressBar percent={c.progress.percent} failedShare={c.progress.total ? ((c.progress.failed + c.progress.blocked) / c.progress.total) * 100 : 0} className="flex-1" />
                      <span className="text-xs tabular-nums">{c.progress.resolved}/{c.progress.total}</span>
                      {c.progress.failed + c.progress.blocked > 0 ? <span className="text-xs text-red-400">{interpolate(dict.qa.overview.failed, { n: c.progress.failed + c.progress.blocked })}</span> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <ChecklistStatusBadge status={c.status} dict={dict} />
                    {c.progress.failed + c.progress.blocked > 0 ? <Link href={`${base}/checklists/${c.id}`} className={buttonVariants({ size: "xs", variant: "outline" })}>{t.viewFailures}</Link> : null}
                    <Link href={`${base}/checklists/${c.id}`} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.open}</Link>
                  </div>
                </li>
              ))}
            </ul>
          </DetailSection>
        </>
      )}
    </div>
  );
}
