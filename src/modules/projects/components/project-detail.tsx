import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";

import type { ProjectPickers } from "../queries";
import type { ProjectDetail } from "../types";
import { ActivityTab } from "./activity-tab";
import { HealthBadge, PriorityBadge, ProgressBar } from "./badges";
import { FinancialsTab } from "./financials-tab";
import { OverviewTab } from "./overview-tab";
import { ProjectStatusSelect } from "./project-header";
import { ProjectTabs, type ProjectTab } from "./project-tabs";
import { TeamTab } from "./team-tab";
import { WorkTab } from "./work-tab";

/** `qaSignal`, `qaCount`, `qaTab` and `paymentsPanel` are slots filled by the route from the QA / Finance modules (Projects imports neither). */
export function ProjectDetailView({ detail, tab, view, pickers, dict, locale, qaSignal, qaCount, qaTab, paymentsPanel }: { detail: ProjectDetail; tab: ProjectTab; view: "list" | "board"; pickers: ProjectPickers; dict: Dictionary; locale: Locale; qaSignal?: ReactNode; qaCount?: number; qaTab?: ReactNode; paymentsPanel?: ReactNode }) {
  const p = detail.project;
  const href = `${getModule("projects").href}/${p.id}`;
  const types = dict.projects.types as Record<string, string>;
  const team = detail.members.filter((m) => m.status !== "removed");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={getModule("projects").href} className={buttonVariants({ variant: "ghost", size: "xs" })}><ArrowLeft data-icon="inline-start" />{dict.sourcing.common.back}</Link>
          <h2 className="text-xl font-semibold tracking-tight">{p.name}</h2>
          <p className="text-sm text-muted-foreground">{[p.clientName, types[p.projectType] ?? p.projectType, p.ownerName].filter(Boolean).join(" · ")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge health={detail.health.status} dict={dict} />
            <PriorityBadge priority={p.priority} dict={dict} />
            <span className="text-xs text-muted-foreground">{dict.projects.overview.deadline}: {formatDate(p.deadline, locale)}</span>
            {qaSignal}
            <span className="flex w-28 items-center gap-1.5"><ProgressBar percent={detail.progress.percent} className="flex-1" /><span className="text-xs tabular-nums">{detail.progress.percent} %</span></span>
          </div>
        </div>
        <ProjectStatusSelect id={p.id} status={p.status} />
      </div>

      <ProjectTabs href={href} counts={{ work: detail.tasks.filter((t) => t.status !== "done").length, team: team.length, qa: qaCount, financials: detail.changeRequests.filter((c) => c.status === "sent").length }} />

      {tab === "overview" ? <OverviewTab detail={detail} dict={dict} locale={locale} owners={pickers.owners} clients={pickers.clients} /> : null}
      {tab === "work" ? <WorkTab projectId={p.id} milestones={detail.milestones} tasks={detail.tasks} members={detail.members} view={view} href={href} /> : null}
      {tab === "team" ? <TeamTab projectId={p.id} currency={p.currency} members={detail.members} tasks={detail.tasks} people={pickers.people} roleCosts={pickers.roleCosts} /> : null}
      {tab === "qa" ? qaTab : null}
      {tab === "financials" ? <FinancialsTab detail={detail} dict={dict} locale={locale} paymentsPanel={paymentsPanel} /> : null}
      {tab === "activity" ? <ActivityTab detail={detail} dict={dict} locale={locale} /> : null}
    </div>
  );
}
