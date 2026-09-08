import Link from "next/link";
import { AlertTriangle, Clock } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { groupOverview } from "../calculations/stats";
import type { QaAttentionGroup, QaChecklistOverview } from "../types";
import { ChecklistStatusBadge, QaProgressBar } from "./qa-badges";

const GROUP_TONE: Record<QaAttentionGroup, string> = {
  needs_attention: "text-red-400",
  ready_for_review: "text-violet-400",
  in_progress: "text-sky-400",
  not_started: "text-muted-foreground",
  approved: "text-emerald-400",
};

/** The delivery control centre: checklists grouped by urgency (desktop table, mobile cards). */
export function QaOverview({ checklists, filtered, dict, locale }: { checklists: QaChecklistOverview[]; filtered: boolean; dict: Dictionary; locale: Locale }) {
  const t = dict.qa.overview;
  const types = dict.projects.types as Record<string, string>;
  const href = (c: QaChecklistOverview) => `${getModule("qa").href}/checklists/${c.id}`;

  if (checklists.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center" data-guide="qa-list">
        <p className="text-sm font-medium">{filtered ? t.emptyFiltered : t.empty}</p>
        {!filtered ? (
          <>
            <p className="max-w-md text-sm text-muted-foreground">{t.emptyHint}</p>
            <Link href={getModule("projects").href} className={buttonVariants({ size: "sm" })}>{t.goToProjects}</Link>
          </>
        ) : null}
      </div>
    );
  }

  const issues = (c: QaChecklistOverview) => {
    const parts: { text: string; tone: string }[] = [];
    if (c.progress.failed) parts.push({ text: interpolate(t.failed, { n: c.progress.failed }), tone: "text-red-400" });
    if (c.progress.blocked) parts.push({ text: interpolate(t.blocked, { n: c.progress.blocked }), tone: "text-amber-400" });
    if (c.overdue) parts.push({ text: t.overdue, tone: "text-red-400" });
    return parts;
  };

  return (
    <div className="space-y-6" data-guide="qa-list">
      {groupOverview(checklists).map(({ group, items }) => (
        <section key={group} className="space-y-2">
          <h3 className={cn("flex items-center gap-2 text-xs font-semibold tracking-wide uppercase", GROUP_TONE[group])}>
            {group === "needs_attention" ? <AlertTriangle className="size-3.5" /> : group === "ready_for_review" ? <Clock className="size-3.5" /> : null}
            {dict.qa.groups[group]} <span className="font-normal text-muted-foreground tabular-nums">({items.length})</span>
          </h3>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-lg border md:block">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                  <th>{t.columns.project}</th><th>{t.columns.type}</th><th>{t.columns.status}</th><th className="w-44">{t.columns.progress}</th><th>{t.columns.issues}</th><th>{t.columns.reviewer}</th><th>{t.columns.due}</th><th>{t.columns.deadline}</th><th>{t.columns.owner}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="relative border-t transition-colors hover:bg-muted/30">
                    <td className="px-3 py-2.5">
                      <Link href={href(c)} className="font-medium hover:underline after:absolute after:inset-0">{c.projectName}</Link>
                      <p className="text-xs text-muted-foreground">{[c.clientName, c.title !== c.templateName ? c.title : c.templateName].filter(Boolean).join(" · ")}{!c.requiredForCompletion ? ` · ${t.optional}` : ""}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{types[c.projectType] ?? c.projectType}</td>
                    <td className="px-3 py-2.5"><ChecklistStatusBadge status={c.status} dict={dict} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <QaProgressBar percent={c.progress.percent} failedShare={c.progress.total ? ((c.progress.failed + c.progress.blocked) / c.progress.total) * 100 : 0} className="flex-1" />
                        <span className="w-14 text-right text-xs tabular-nums">{c.progress.resolved}/{c.progress.total}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-xs">{issues(c).length ? issues(c).map((i) => <span key={i.text} className={cn("mr-2", i.tone)}>{i.text}</span>) : c.status === "approved" && c.approvedByName ? <span className="text-emerald-400">{interpolate(t.approvedBy, { name: c.approvedByName })}</span> : <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-3 py-2.5 text-xs">{c.reviewerName ?? <span className="text-muted-foreground">{t.noReviewer}</span>}</td>
                    <td className={cn("px-3 py-2.5 text-xs", c.overdue && "font-medium text-red-400")}>{formatDate(c.dueDate, locale)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{formatDate(c.projectDeadline, locale)}</td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{c.projectOwnerName ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile */}
          <div className="space-y-2 md:hidden">
            {items.map((c) => (
              <Link key={c.id} href={href(c)} className="block rounded-lg border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="line-clamp-1 font-medium">{c.projectName}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">{[c.clientName, types[c.projectType] ?? c.projectType, c.title].filter(Boolean).join(" · ")}</p>
                  </div>
                  <ChecklistStatusBadge status={c.status} dict={dict} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <QaProgressBar percent={c.progress.percent} failedShare={c.progress.total ? ((c.progress.failed + c.progress.blocked) / c.progress.total) * 100 : 0} className="flex-1" />
                  <span className="text-xs tabular-nums">{c.progress.resolved}/{c.progress.total}</span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {issues(c).map((i) => <span key={i.text} className={cn("mr-2", i.tone)}>{i.text}</span>)}
                  {c.dueDate ? <span className={cn(c.overdue && "text-red-400")}>{t.columns.due} {formatDate(c.dueDate, locale)}</span> : c.projectDeadline ? <span>{interpolate(t.deadlineIn, { date: formatDate(c.projectDeadline, locale) })}</span> : null}
                </p>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
