import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { DetailSection, Facts } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";
import type { ProfileCapacityDetailsRow } from "@/types/database";

import { hours, percent, periodLabel } from "../services/format";
import { capacityHref, type CapacityParams } from "../services/links";
import type { PersonLoad } from "../types";
import { HealthBadge, UtilizationBar } from "./health-badge";
import { InternalCapacityForm } from "./internal-capacity-form";
import { PeriodNav } from "./period-nav";
import { WarningsList } from "./warnings-list";

const AVAILABILITY_TONE = { available: "approved", limited: "shortlisted", unavailable: "rejected", unknown: "discovered" } as const;

export function PersonDetail({ load, params, profileCapacity, dict, locale }: { load: PersonLoad; params: CapacityParams; profileCapacity: ProfileCapacityDetailsRow | null; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity;
  const d = t.detail;
  const p = load.person;
  const statuses = dict.projects.statuses as Record<string, string>;
  const talentHref = p.kind === "talent" ? `${getModule("talent").href}/${p.id}` : null;

  return (
    <div className="space-y-6" data-guide="capacity-person">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={capacityHref({ kind: params.kind, period: params.period })} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />
            {dict.sourcing.common.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{p.name}</h2>
          <p className="text-sm text-muted-foreground">{[p.role, t.kinds[p.kind]].filter(Boolean).join(" · ")}</p>
          <div className="flex flex-wrap items-center gap-2">
            <HealthBadge health={load.health} dict={dict} />
            {p.availability ? <StatusBadge status={AVAILABILITY_TONE[p.availability]} label={dict.talent.availabilities[p.availability]} /> : null}
            {p.benchStatus ? <StatusBadge status={p.benchStatus === "archived" ? "archived" : "reviewed"} label={dict.talent.statuses[p.benchStatus]} /> : null}
            <span className="text-xs text-muted-foreground">
              {p.monthlyCapacity == null ? t.notConfigured : interpolate(d.capacitySourceHint, { value: p.monthlyCapacity, source: d.sourceLabel[p.capacitySource] })}
              {p.availableFrom ? ` · ${d.from} ${formatDate(p.availableFrom, locale)}` : ""}
            </span>
          </div>
        </div>
        {talentHref ? (
          <Link href={talentHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ExternalLink data-icon="inline-start" />
            {p.monthlyCapacity == null ? t.configureInTalent : d.openInTalent}
          </Link>
        ) : null}
      </div>

      <PeriodNav period={load.period} params={params} path={`/${encodeURIComponent(p.key)}`} dict={dict} locale={locale} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: d.available, value: hours(load.available, locale) },
          { label: d.booked, value: hours(load.booked, locale), sub: load.unscheduled > 0 ? interpolate(t.unscheduledShort, { h: hours(load.unscheduled, locale) }) : undefined },
          { label: d.remaining, value: hours(load.remaining, locale), warn: load.remaining != null && load.remaining < 0 },
          { label: d.utilization, value: percent(load.utilization, locale), warn: (load.utilization ?? 0) >= 100 },
        ].map((i) => (
          <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{i.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", i.warn && "text-red-400")}>{i.value}</p>
            {i.sub ? <p className="text-[11px] text-amber-400">{i.sub}</p> : null}
          </div>
        ))}
      </div>
      <UtilizationBar utilization={load.utilization} health={load.health} className="h-2" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DetailSection title={`${d.breakdown} · ${periodLabel(load.period, dict, locale)}`}>
            {load.projects.length === 0 ? <p className="text-sm text-muted-foreground">{d.noProjects}</p> : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr className="[&>th]:py-1.5 [&>th]:pr-3 [&>th]:text-left [&>th]:font-medium">
                      <th>{t.projects.title}</th><th>{d.assignmentDates}</th><th className="text-right!">{d.planned}</th><th className="text-right!">{d.taskHours}</th><th className="text-right!">{d.unscheduled}</th><th className="text-right!">{d.inPeriod}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {load.projects.map((pr) => (
                      <tr key={pr.memberId} className="border-t border-border/60 [&>td]:py-2 [&>td]:pr-3">
                        <td>
                          <Link href={`${getModule("projects").href}/${pr.projectId}?tab=team`} className="font-medium hover:underline">{pr.projectName}</Link>
                          <span className="block text-xs text-muted-foreground">{pr.projectRole} · {statuses[pr.projectStatus] ?? pr.projectStatus}{pr.projectDeadline ? ` · ${t.projects.deadline} ${formatDate(pr.projectDeadline, locale)}` : ""}</span>
                        </td>
                        <td className="text-xs text-muted-foreground">{[pr.startsOn, pr.endsOn].map((x) => formatDate(x, locale)).join(" – ")}</td>
                        <td className="text-right tabular-nums">{hours(pr.plannedHours, locale)}</td>
                        <td className="text-right tabular-nums">{hours(pr.taskEstimatedHours, locale)}</td>
                        <td className={cn("text-right tabular-nums", pr.unscheduledHours > 0 && "text-amber-400")}>{hours(pr.unscheduledHours, locale)}</td>
                        <td className="text-right font-medium tabular-nums">{hours(pr.hours, locale)}</td>
                      </tr>
                    ))}
                    <tr className="border-t font-medium [&>td]:py-2 [&>td]:pr-3">
                      <td colSpan={5}>{d.total}</td>
                      <td className="text-right tabular-nums">{hours(load.booked, locale)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-[11px] text-muted-foreground">{d.calculationHint}</p>
          </DetailSection>

          {load.projects.some((pr) => pr.allocations.length) ? (
            <DetailSection title={d.allocations}>
              <ul className="space-y-1 text-xs">
                {load.projects.flatMap((pr) => pr.allocations.map((a) => (
                  <li key={`${a.memberId}-${a.taskId ?? "rem"}-${a.label}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 py-1">
                    <span>{pr.projectName} · <span className="text-muted-foreground">{a.source === "task" ? a.label : d.remainderLabel}</span></span>
                    <span className="text-muted-foreground tabular-nums">{a.rangeStart && a.rangeEnd ? `${formatDate(a.rangeStart, locale)} – ${formatDate(a.rangeEnd, locale)} · ` : ""}{hours(a.hours, locale)} / {hours(a.totalHours, locale)}</span>
                  </li>
                )))}
              </ul>
            </DetailSection>
          ) : null}
        </div>

        <div className="space-y-6">
          <DetailSection title={d.warnings}>
            <WarningsList warnings={load.warnings} dict={dict} />
          </DetailSection>
          {p.kind === "user" ? (
            <DetailSection title={d.internal.title}>
              <InternalCapacityForm profileId={p.id} initial={{ monthlyCapacityHours: profileCapacity?.monthly_capacity_hours ?? null, preferredMonthlyHours: profileCapacity?.preferred_monthly_hours ?? null, capacityActive: profileCapacity?.capacity_active ?? true, notes: profileCapacity?.notes ?? null }} />
            </DetailSection>
          ) : (
            <DetailSection title={d.talentSource}>
              <Facts columns={1} items={[
                { label: dict.talent.detail.preferredMonthlyHours, value: p.capacitySource === "preferred" ? p.monthlyCapacity : null },
                { label: dict.talent.detail.maxMonthlyHours, value: p.monthlyMaximum },
                { label: dict.talent.detail.availableFrom, value: p.availableFrom ? formatDate(p.availableFrom, locale) : null },
                { label: dict.talent.detail.benchStatus, value: p.benchStatus ? dict.talent.statuses[p.benchStatus] : null },
              ]} />
              <p className="mt-3 text-xs text-muted-foreground">{d.talentSourceHint}</p>
              {talentHref ? <Link href={talentHref} className={cn(buttonVariants({ variant: "ghost", size: "xs" }), "mt-2")}>{t.configureInTalent}</Link> : null}
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  );
}
