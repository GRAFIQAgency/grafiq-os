import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DetailSection } from "@/components/shared/detail-section";
import { FilterField, SelectFilter } from "@/components/shared/filter-form";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { hours, percent, periodLabel } from "../services/format";
import { capacityHref, personHref, type CapacityParams } from "../services/links";
import type { CapacityPerson, WhatIfResult } from "../types";
import { HealthBadge } from "./health-badge";

/**
 * What-if capacity check. A plain GET form: the page computes the result with
 * the pure simulator and nothing is stored anywhere.
 */
export function WhatIfPanel({ people, roles, result, params, defaults, dict, locale }: {
  people: CapacityPerson[]; roles: string[]; result: WhatIfResult | null; params: CapacityParams; defaults: { start: string; end: string }; dict: Dictionary; locale: Locale;
}) {
  const t = dict.capacity.whatif;
  const keep = { kind: params.kind, period: params.period, view: params.view, horizon: params.horizon };
  const input = result?.input;
  return (
    <DetailSection title={t.title}>
      <div data-guide="capacity-whatif">
        <p className="mb-3 text-xs text-muted-foreground">{t.description}</p>
        <form method="get" action={capacityHref({})} className="grid grid-cols-2 gap-3 md:grid-cols-6 md:items-end">
          {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
          <FilterField label={t.person} className="col-span-2">
            <SelectFilter name="wiPerson" defaultValue={input?.personKey} anyLabel={t.orRole} options={people.map((p) => ({ value: p.key, label: p.role ? `${p.name} · ${p.role}` : p.name }))} />
          </FilterField>
          <FilterField label={t.role} className="col-span-2 md:col-span-1">
            <SelectFilter name="wiRole" defaultValue={input?.role} anyLabel="—" options={roles.map((r) => ({ value: r, label: r }))} />
          </FilterField>
          <FilterField label={t.hours}><Input name="wiHours" type="number" min={1} step="any" defaultValue={input?.hours ?? ""} className="h-8 text-right tabular-nums" required /></FilterField>
          <FilterField label={t.from}><Input name="wiFrom" type="date" defaultValue={input?.start ?? defaults.start} className="h-8" required /></FilterField>
          <FilterField label={t.to}><Input name="wiTo" type="date" defaultValue={input?.end ?? defaults.end} className="h-8" required /></FilterField>
          <div className="col-span-2 flex items-center gap-3 md:col-span-6">
            <button type="submit" className={buttonVariants({ size: "sm" })}>{t.run}</button>
            <span className="text-[11px] text-muted-foreground">{t.notPersisted}</span>
          </div>
        </form>

        {result ? (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium">
              {input?.personKey ? t.resultTitle : interpolate(t.candidatesTitle, { role: input?.role ?? "" })}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{periodLabel(result.period, dict, locale)} · +{hours(input?.hours ?? 0, locale)}</span>
            </p>
            {result.candidates.length === 0 ? <p className="text-sm text-muted-foreground">{t.noCandidates}</p> : (
              <ol className="space-y-2">
                {result.candidates.map((c, i) => (
                  <li key={c.person.key} className={cn("rounded-md border p-3", c.overBy > 0 && "border-red-500/30")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <span className="text-xs text-muted-foreground tabular-nums">{i + 1}.</span>{" "}
                        <Link href={personHref(c.person.key, params)} className="font-medium hover:underline">{c.person.name}</Link>
                        {c.person.role ? <span className="ml-2 text-xs text-muted-foreground">{c.person.role}</span> : null}
                      </div>
                      <div className="flex items-center gap-2">
                        {c.available == null ? <span className="text-xs text-amber-400">{dict.capacity.notConfigured}</span> : c.overBy > 0 ? (
                          <span className="text-xs font-medium text-red-400">{interpolate(t.over, { hours: hours(c.overBy, locale) })}</span>
                        ) : (
                          <span className="text-xs font-medium text-emerald-400">{interpolate(t.fits, { hours: hours((c.available ?? 0) - c.forecast, locale) })}</span>
                        )}
                        <HealthBadge health={c.health} dict={dict} />
                      </div>
                    </div>
                    <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
                      <div><dt className="text-muted-foreground">{t.existing}</dt><dd className="tabular-nums">{hours(c.booked, locale)}</dd></div>
                      <div><dt className="text-muted-foreground">{t.available}</dt><dd className="tabular-nums">{hours(c.available, locale)}</dd></div>
                      <div><dt className="text-muted-foreground">{t.newWork}</dt><dd className="tabular-nums">+{hours(input?.hours ?? 0, locale)}</dd></div>
                      <div><dt className="text-muted-foreground">{t.forecast}</dt><dd className="tabular-nums">{hours(c.forecast, locale)} · {percent(c.forecastUtilization, locale)}</dd></div>
                    </dl>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}
      </div>
    </DetailSection>
  );
}
