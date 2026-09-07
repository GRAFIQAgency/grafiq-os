import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { hours, percent } from "../services/format";
import { personHref, type CapacityParams } from "../services/links";
import type { ProjectCapacityView } from "../types";
import { HealthBadge } from "./health-badge";

export function ProjectsView({ views, params, dict, locale }: { views: ProjectCapacityView[]; params: CapacityParams; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity.projects;
  const statuses = dict.projects.statuses as Record<string, string>;
  if (!views.length) return <p className="rounded-lg border border-dashed px-6 py-16 text-center text-sm text-muted-foreground" data-guide="capacity-people">{t.empty}</p>;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2" data-guide="capacity-people">
      {views.map((v) => (
        <article key={v.projectId} className={cn("rounded-lg border bg-card p-4", v.conflicts.length && "border-red-500/30")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={`${getModule("projects").href}/${v.projectId}`} className="font-medium hover:underline">{v.projectName}</Link>
              <p className="text-xs text-muted-foreground">{statuses[v.projectStatus] ?? v.projectStatus} · {t.deadline}: {formatDate(v.projectDeadline, locale)}</p>
            </div>
            <p className="text-sm font-semibold tabular-nums">{hours(v.hours, locale)}</p>
          </div>
          <ul className="mt-3 divide-y divide-border/60 text-sm">
            {v.people.map((p) => (
              <li key={p.personKey} className="flex items-center justify-between gap-2 py-1.5">
                <span className="min-w-0">
                  <Link href={personHref(p.personKey, params)} className="hover:underline">{p.name}</Link>
                  <span className="ml-2 text-xs text-muted-foreground">{p.role}</span>
                </span>
                <span className="flex items-center gap-3 text-xs">
                  {p.unscheduled > 0 ? <span className="text-amber-400">{interpolate(dict.capacity.unscheduledShort, { h: hours(p.unscheduled, locale) })}</span> : null}
                  <span className="tabular-nums">{hours(p.hours, locale)}</span>
                  <span className="w-12 text-right tabular-nums text-muted-foreground">{percent(p.utilization, locale)}</span>
                  <HealthBadge health={p.health} dict={dict} />
                </span>
              </li>
            ))}
          </ul>
          {v.conflicts.length ? (
            <div className="mt-3 space-y-1 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-xs text-red-300">
              {v.conflicts.map((c) => (
                <p key={c.personKey} className="flex items-center gap-1.5"><AlertTriangle className="size-3" />{interpolate(t.conflict, { name: c.name, hours: hours(c.overBy, locale) })}</p>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">{t.noConflicts}</p>
          )}
        </article>
      ))}
    </div>
  );
}
