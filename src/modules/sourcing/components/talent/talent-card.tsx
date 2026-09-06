"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { HIGH_TALENT_SCORE } from "../../constants";
import type { TalentCandidate } from "../../types";
import { Chips } from "../shared/chips";
import type { ReviewCardState } from "../shared/review-list";
import { ScoreBadge } from "../shared/score-badge";
import { StatusBadge } from "../shared/status-badge";

export function TalentCard({ candidate, state }: { candidate: TalentCandidate; state: ReviewCardState }) {
  const { dict } = useI18n();
  const t = dict.sourcing.talent;
  const r = dict.sourcing.review;
  const href = `${getModule("sourcing").href}/talent/${candidate.id}`;
  const initials = candidate.fullName.split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("");
  const rate = candidate.hourlyRateMin != null || candidate.hourlyRateMax != null
    ? `${candidate.hourlyRateMin ?? "?"}–${candidate.hourlyRateMax ?? "?"} ${candidate.rateCurrency ?? ""}/h`
    : null;

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
        <Checkbox checked={state.selected} onCheckedChange={state.toggle} aria-label={candidate.fullName} />
      </div>
      <Avatar className="size-10">
        {candidate.avatarUrl ? <AvatarImage src={candidate.avatarUrl} alt="" /> : null}
        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={href} className="font-medium hover:underline">{candidate.fullName}</Link>
          {candidate.role ? <span className="text-sm text-muted-foreground">{candidate.role}</span> : null}
          {candidate.seniority ? <span className="text-xs text-muted-foreground">· {t.seniorities[candidate.seniority]}</span> : null}
          <StatusBadge status={candidate.status} label={t.statuses[candidate.status]} />
          {candidate.inTalentBench ? <StatusBadge status="approved" label={r.inBench} /> : null}
        </div>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          {[candidate.city, candidate.country].filter(Boolean).join(", ") || t.unknown}
          {candidate.remote ? <span>· {t.remote}</span> : null}
          {candidate.yearsExperience != null ? <span>· {interpolate(t.years, { n: candidate.yearsExperience })}</span> : null}
          {rate ? <span>· {rate}</span> : null}
          {candidate.availability ? <span>· {t.availabilities[candidate.availability]}</span> : null}
          {candidate.portfolioUrl ? (
            <a href={candidate.portfolioUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground" onClick={(e) => e.stopPropagation()}>
              {t.portfolio} <ExternalLink className="size-3" />
            </a>
          ) : null}
        </p>
        <Chips items={[...candidate.skills, ...candidate.technologies.filter((x) => !candidate.skills.includes(x))]} max={8} />
        {candidate.summary ? <p className="line-clamp-2 text-xs text-muted-foreground">{candidate.summary}</p> : null}
        {candidate.tags.length ? <Chips items={candidate.tags.map((x) => `#${x}`)} max={5} /> : null}
      </div>
      <div className="flex flex-col items-end gap-2">
        <ScoreBadge score={candidate.aiScore} manual={candidate.manualScore} highFrom={HIGH_TALENT_SCORE} />
        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button size="xs" variant={candidate.inTalentBench ? "ghost" : "default"} disabled={state.busy || candidate.inTalentBench} onClick={() => state.act("save")}>
            {candidate.inTalentBench ? r.inBench : r.saveToBench}
          </Button>
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
