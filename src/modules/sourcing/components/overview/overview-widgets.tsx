import Link from "next/link";
import { AlertTriangle, Bookmark, Building2, Sparkles, Star, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getModule } from "@/config/modules";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { HIGH_LEAD_SCORE, HIGH_TALENT_SCORE } from "../../constants";
import type { OverviewStats } from "../../queries/overview";
import type { SearchRun } from "../../types";

function Tile({ label, value, icon: Icon, href, warning }: { label: string; value: number; icon: LucideIcon; href: string; warning?: boolean }) {
  return (
    <Link href={href} className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted/30">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground", warning && value > 0 && "border-amber-500/30 bg-amber-500/10 text-amber-400")}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
    </Link>
  );
}

export function OverviewWidgets({ stats, dict }: { stats: OverviewStats; dict: Dictionary }) {
  const t = dict.sourcing.overview;
  const base = getModule("sourcing").href;
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
      <Tile label={t.newTalent} value={stats.newTalentThisWeek} icon={Users} href={`${base}/talent`} />
      <Tile label={t.newLeads} value={stats.newLeadsThisWeek} icon={Building2} href={`${base}/companies`} />
      <Tile label={t.savedSearches} value={stats.savedSearches} icon={Bookmark} href={`${base}/searches`} />
      <Tile label={interpolate(t.highMatchTalent, { n: HIGH_TALENT_SCORE })} value={stats.highMatchTalent} icon={Sparkles} href={`${base}/talent?minScore=${HIGH_TALENT_SCORE}&sort=score`} />
      <Tile label={interpolate(t.highScoreLeads, { n: HIGH_LEAD_SCORE })} value={stats.highScoreLeads} icon={Star} href={`${base}/companies?minScore=${HIGH_LEAD_SCORE}&sort=score`} />
      <Tile label={t.sourcesWithErrors} value={stats.sourcesWithErrors} icon={AlertTriangle} href={`${base}/sources`} warning />
    </div>
  );
}

export function QuickStart({ dict }: { dict: Dictionary }) {
  const t = dict.sourcing.overview;
  const base = getModule("sourcing").href;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Link href={`${base}/talent`} className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted/30">
        <p className="flex items-center gap-2 font-medium"><Users className="size-4" /> {t.findTalent}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.findTalentHint}</p>
      </Link>
      <Link href={`${base}/companies`} className="rounded-lg border bg-card p-5 transition-colors hover:bg-muted/30">
        <p className="flex items-center gap-2 font-medium"><Building2 className="size-4" /> {t.findClients}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t.findClientsHint}</p>
      </Link>
    </div>
  );
}

export function RecentRuns({ runs, dict, locale }: { runs: SearchRun[]; dict: Dictionary; locale: Locale }) {
  const t = dict.sourcing.overview;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  return (
    <Card className="gap-4">
      <CardHeader>
        <CardTitle>{t.recentRuns}</CardTitle>
        <CardDescription>{t.placeholderNote}</CardDescription>
      </CardHeader>
      <CardContent>
        {runs.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noRuns}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                <span>
                  <span className="font-medium">{r.entityType === "talent" ? dict.sourcing.tabs.talent : dict.sourcing.tabs.companies}</span>
                  <span className="text-muted-foreground"> · {r.status} · {r.sourcesCompleted}/{r.sourcesTotal} · {r.resultsTotal} ({r.resultsNew} new, {r.resultsDuplicates} dup){r.errors.length ? ` · ${r.errors.length} err` : ""}</span>
                </span>
                <span className="text-xs text-muted-foreground">{fmt.format(new Date(r.createdAt))}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
