"use client";

import Link from "next/link";
import { ExternalLink, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

import { HIGH_LEAD_SCORE } from "../../constants";
import type { CompanyLead, CompanySignal } from "../../types";
import { Chips } from "@/components/shared/chips";
import type { ReviewCardState } from "../shared/review-list";
import { ScoreBadge } from "../shared/score-badge";
import { StatusBadge } from "@/components/shared/status-badge";
import { SignalChips } from "./signals-list";

export function CompanyCard({ lead, signals, state }: { lead: CompanyLead; signals: CompanySignal[]; state: ReviewCardState }) {
  const { dict } = useI18n();
  const t = dict.sourcing.companies;
  const r = dict.sourcing.review;
  const href = `${getModule("sourcing").href}/companies/${lead.id}`;

  return (
    <article
      className={cn(
        "grid grid-cols-[auto_auto_1fr_auto] gap-3 rounded-lg border bg-card p-3 transition-colors",
        state.active && "border-foreground/40 ring-1 ring-foreground/20",
        state.selected && "bg-muted/40",
        state.busy && "opacity-60"
      )}
    >
      <div className="pt-1" onClick={(e) => e.stopPropagation()}>
        <Checkbox checked={state.selected} onCheckedChange={state.toggle} aria-label={lead.name} />
      </div>
      <div className="flex size-10 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground">
        {lead.logoUrl ? (
          // Logos come from arbitrary external hosts; next/image would need a remote allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={lead.logoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Globe className="size-4" />
        )}
      </div>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="font-medium hover:underline">{lead.name}</Link>
          {lead.industry ? <span className="text-sm text-muted-foreground">{lead.industry}</span> : null}
          <StatusBadge status={lead.status} label={t.statuses[lead.status]} />
          {lead.crmStatus ? <StatusBadge status="qualified" label={`${r.inCrm} · ${t.crmStatuses[lead.crmStatus]}`} /> : null}
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {[lead.city, lead.country].filter(Boolean).join(", ") || "—"}
          {lead.employeeCount != null ? <span>· {lead.employeeCount} {t.employees.toLowerCase()}</span> : lead.sizeBucket ? <span>· {lead.sizeBucket}</span> : null}
          {lead.companyType ? <span>· {t.types[lead.companyType]}</span> : null}
          {lead.website ? (
            <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
              {lead.domain ?? t.website} <ExternalLink className="size-3" />
            </a>
          ) : null}
        </p>
        {lead.description ? <p className="line-clamp-2 text-xs text-muted-foreground">{lead.description}</p> : null}
        <SignalChips signals={signals} dict={dict} />
        {lead.tags.length ? <Chips items={lead.tags.map((x) => `#${x}`)} max={5} /> : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <ScoreBadge score={lead.leadScore} manual={lead.manualScore} highFrom={HIGH_LEAD_SCORE} />
        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          {lead.crmStatus ? (
            <Link href={href} className="inline-flex h-6 items-center px-2 text-xs text-muted-foreground hover:text-foreground">{r.openCrm}</Link>
          ) : (
            <Button size="xs" disabled={state.busy} onClick={() => state.act("save")}>{r.saveToCrm}</Button>
          )}
          <div className="flex gap-1">
            <Button size="xs" variant="ghost" disabled={state.busy} onClick={() => state.act("review")}>{r.markReviewed}</Button>
            <Button size="xs" variant="ghost" disabled={state.busy} onClick={() => state.act("reject")} className="text-red-400 hover:text-red-300">{r.reject}</Button>
            <Link href={href} className="inline-flex h-6 items-center px-2 text-xs text-muted-foreground hover:text-foreground">{r.view}</Link>
          </div>
        </div>
      </div>
    </article>
  );
}
