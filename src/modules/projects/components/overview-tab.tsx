import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { DetailSection, Facts } from "@/components/shared/detail-section";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ProjectDetail } from "../types";
import { HealthBadge, PriorityBadge, ProgressBar, healthReasonText } from "./badges";
import { LinksEditor, ManualProgress, ProjectEditForm } from "./overview-forms";

export function OverviewTab({ detail, dict, locale, owners, clients }: { detail: ProjectDetail; dict: Dictionary; locale: Locale; owners: { id: string; label: string }[]; clients: { id: string; label: string }[] }) {
  const t = dict.projects.overview;
  const p = detail.project;
  const f = detail.financials;
  const nextMilestone = detail.milestones.find((m) => m.status !== "completed");
  const blocked = detail.tasks.filter((x) => x.status === "blocked");
  const team = detail.members.filter((m) => m.status !== "removed");
  const types = dict.projects.types as Record<string, string>;

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="space-y-6 xl:col-span-2">
        <DetailSection title={dict.projects.tabs.overview}>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <HealthBadge health={detail.health.status} dict={dict} className="h-7 px-3 text-sm" />
            <PriorityBadge priority={p.priority} dict={dict} />
            <div className="flex min-w-48 flex-1 items-center gap-2">
              <ProgressBar percent={detail.progress.percent} className="flex-1" />
              <span className="text-xs tabular-nums">{detail.progress.percent} %</span>
              <span className="text-xs text-muted-foreground">({dict.projects.progress.basis[detail.progress.basis]})</span>
            </div>
          </div>
          {detail.health.reasons.length ? (
            <ul className="mb-4 list-disc space-y-0.5 pl-5 text-sm text-amber-400" data-guide="projects-health">
              {detail.health.reasons.map((r, i) => <li key={i}>{healthReasonText(r, dict)}</li>)}
            </ul>
          ) : <p className="mb-4 text-sm text-muted-foreground" data-guide="projects-health">{dict.projects.healthReasons.none}</p>}
          <Facts items={[
            { label: t.client, value: p.clientName ? (p.clientId ? <Link href={`${getModule("sourcing").href}/companies/${p.clientId}`} className="hover:underline">{p.clientName}</Link> : p.clientName) : null },
            { label: dict.projects.list.columns.type, value: types[p.projectType] ?? p.projectType },
            { label: t.owner, value: p.ownerName },
            { label: t.start, value: formatDate(p.startDate, locale) },
            { label: t.deadline, value: formatDate(p.deadline, locale) },
            { label: t.revenue, value: formatMoney(f.current.revenue, p.currency, locale) },
            { label: t.currentMargin, value: <>{formatPercent(f.forecast.grossMargin, locale, 0)} <span className="text-xs text-muted-foreground">({interpolate(t.soldMargin, { margin: formatPercent(f.baseline.grossMargin, locale, 0) })})</span></> },
            { label: t.contact, value: [p.contactName, p.contactEmail, p.contactPhone].filter(Boolean).join(" · ") || null },
          ]} />
          <p className="mt-3 text-xs text-muted-foreground">
            {interpolate(p.pricingEstimateId ? t.baselineFrom : t.baselineManual, { date: formatDate(p.baselineCreatedAt, locale) })}
            {p.pricingEstimateId ? <> · <Link href={`${getModule("pricing").href}?estimate=${p.pricingEstimateId}`} className="hover:underline">{t.openEstimate}</Link></> : null}
          </p>
          {detail.progress.basis === "none" || detail.progress.basis === "manual" ? <ManualProgress id={p.id} value={p.manualProgress} /> : null}
        </DetailSection>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <DetailSection title={t.nextMilestone}>
            {nextMilestone ? (
              <p className="text-sm">{nextMilestone.title} <span className="text-xs text-muted-foreground">· {formatDate(nextMilestone.dueDate, locale)} · {dict.projects.work.milestoneStatuses[nextMilestone.status]}</span></p>
            ) : <p className="text-sm text-muted-foreground">{t.noMilestone}</p>}
          </DetailSection>
          <DetailSection title={t.blocked}>
            {blocked.length ? (
              <ul className="space-y-1 text-sm">{blocked.map((x) => <li key={x.id}>{x.title}{x.blockedReason ? <span className="text-xs text-muted-foreground"> · {x.blockedReason}</span> : null}</li>)}</ul>
            ) : <p className="text-sm text-muted-foreground">{t.noBlocked}</p>}
          </DetailSection>
        </div>

        <ProjectEditForm project={p} owners={owners} clients={clients} />
      </div>

      <div className="space-y-6">
        <DetailSection title={t.team}>
          {team.length ? (
            <ul className="space-y-1.5 text-sm">
              {team.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span>{m.talentCandidateId ? <Link href={`${getModule("talent").href}/${m.talentCandidateId}`} className="hover:underline">{m.displayName}</Link> : m.displayName}</span>
                  <span className="text-xs text-muted-foreground">{m.projectRole}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t.noTeam}</p>}
          <Link href="?tab=team" className={buttonVariants({ variant: "ghost", size: "xs", className: "mt-3" })}>{dict.projects.tabs.team} →</Link>
        </DetailSection>
        <DetailSection title={t.links}>
          {detail.links.length ? (
            <ul className="space-y-1 text-sm">
              {detail.links.map((l) => (
                <li key={l.id}><a href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{l.label} <ExternalLink className="size-3" /></a> <span className="text-xs text-muted-foreground">· {dict.projects.linkKinds[l.kind]}</span></li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">{t.noLinks}</p>}
          <LinksEditor projectId={p.id} links={detail.links} />
        </DetailSection>
        <DetailSection title={t.notes}>
          <p className="text-sm whitespace-pre-wrap text-muted-foreground">{p.notes || t.noNotes}</p>
        </DetailSection>
      </div>
    </div>
  );
}
