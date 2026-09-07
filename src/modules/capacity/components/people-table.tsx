import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { hours, percent } from "../services/format";
import { personHref, type CapacityParams } from "../services/links";
import type { PersonLoad } from "../types";
import { HealthBadge, UtilizationBar } from "./health-badge";

const AVAILABILITY_TONE = { available: "approved", limited: "shortlisted", unavailable: "rejected", unknown: "discovered" } as const;

export function PeopleEmpty({ dict, filtered }: { dict: Dictionary; filtered: boolean }) {
  const t = dict.capacity;
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center" data-guide="capacity-people">
      <p className="text-sm font-medium">{filtered ? t.emptyFiltered : t.empty}</p>
      {!filtered ? <Link href={getModule("talent").href} className={buttonVariants({ size: "sm" })}>{t.goToTalent}</Link> : null}
    </div>
  );
}

function ConfigureLink({ load, dict }: { load: PersonLoad; dict: Dictionary }) {
  const t = dict.capacity;
  const href = load.person.kind === "talent" ? `${getModule("talent").href}/${load.person.id}` : personHref(load.person.key);
  return <Link href={href} className="text-xs text-amber-400 underline-offset-2 hover:underline">{load.person.kind === "talent" ? t.configureInTalent : t.configure}</Link>;
}

/** Desktop table + mobile cards, both from the same loads. */
export function PeopleTable({ loads, params, dict, locale }: { loads: PersonLoad[]; params: CapacityParams; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity;
  const cols = t.columns;
  return (
    <div data-guide="capacity-people">
      {/* Desktop */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full min-w-[960px] text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
              <th>{cols.person}</th>
              <th>{cols.availability}</th>
              <th className="text-right!">{cols.available}</th>
              <th className="text-right!">{cols.booked}</th>
              <th className="text-right!">{cols.remaining}</th>
              <th className="w-44">{cols.utilization}</th>
              <th className="text-right!">{cols.assignments}</th>
              <th>{cols.health}</th>
            </tr>
          </thead>
          <tbody>
            {loads.map((l) => {
              const p = l.person;
              return (
                <tr key={p.key} className={cn("relative border-t transition-colors hover:bg-muted/30", l.health === "unavailable" && "opacity-60")}>
                  <td className="px-3 py-2.5">
                    <Link href={personHref(p.key, params)} className="font-medium hover:underline after:absolute after:inset-0">{p.name}</Link>
                    <p className="text-xs text-muted-foreground">{[p.role, t.kinds[p.kind]].filter(Boolean).join(" · ")}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.availability ? <StatusBadge status={AVAILABILITY_TONE[p.availability]} label={dict.talent.availabilities[p.availability]} /> : <span className="text-xs text-muted-foreground">{t.kinds.user}</span>}
                    {p.availableFrom ? <span className="block text-[11px] text-muted-foreground">{t.detail.from} {p.availableFrom}</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {l.available == null ? <span className="relative z-10"><ConfigureLink load={l} dict={dict} /></span> : hours(l.available, locale)}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {hours(l.booked, locale)}
                    {l.unscheduled > 0 ? <span className="flex items-center justify-end gap-1 text-[11px] text-amber-400"><AlertTriangle className="size-3" />{interpolate(t.unscheduledShort, { h: hours(l.unscheduled, locale) })}</span> : null}
                  </td>
                  <td className={cn("px-3 py-2.5 text-right tabular-nums", l.remaining != null && l.remaining < 0 && "font-medium text-red-400")}>{hours(l.remaining, locale)}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <UtilizationBar utilization={l.utilization} health={l.health} className="flex-1" />
                      <span className="w-12 text-right text-xs tabular-nums">{percent(l.utilization, locale)}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{l.activeAssignments}</td>
                  <td className="px-3 py-2.5"><HealthBadge health={l.health} dict={dict} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="space-y-2 md:hidden">
        {loads.map((l) => {
          const p = l.person;
          return (
            <Link key={p.key} href={personHref(p.key, params)} className="block rounded-lg border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium">{p.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{[p.role, t.kinds[p.kind]].filter(Boolean).join(" · ")}</p>
                </div>
                <HealthBadge health={l.health} dict={dict} />
              </div>
              <div className="mt-2 flex items-center gap-2">
                <UtilizationBar utilization={l.utilization} health={l.health} className="flex-1" />
                <span className="text-xs tabular-nums">{percent(l.utilization, locale)}</span>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
                {l.available == null ? t.notConfigured : `${interpolate(t.ofHours, { booked: hours(l.booked, locale), available: hours(l.available, locale) })} · ${interpolate(t.remainingShort, { h: hours(l.remaining, locale) })}`}
                {l.unscheduled > 0 ? ` · ${interpolate(t.unscheduledShort, { h: hours(l.unscheduled, locale) })}` : ""}
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
