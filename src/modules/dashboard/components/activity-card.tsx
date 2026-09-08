import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INTL_LOCALES, type Dictionary, type Locale } from "@/lib/i18n/config";

import type { ActivityFeedItem } from "../services/activity";
import type { Loaded } from "../types";

/** The shared activity log, company-wide. Labels come from the module that logged the event. */
export function ActivityCard({ loaded, dict, locale }: { loaded: Loaded<ActivityFeedItem[]>; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.activity;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  const labels = {
    ...dict.projects.activity.actions, ...dict.sales.activity.actions, ...dict.qa.activity.actions,
    ...dict.finance.activity.actions, ...dict.sourcing.common.actions,
  } as Record<string, string>;
  const entries = loaded.state === "error" ? [] : loaded.data ?? [];

  return (
    <Card className="gap-4" data-guide="dashboard-activity">
      <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
      <CardContent>
        {loaded.state === "error" ? <p className="text-sm text-muted-foreground">{dict.dashboard.unavailable}</p>
          : entries.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
            <ul className="space-y-2 text-sm">
              {entries.map((e) => {
                const label = labels[e.action] ?? e.action;
                const body = (
                  <>
                    <span className="min-w-0">
                      <span className="line-clamp-1">{label}{e.detail ? <span className="text-muted-foreground"> · {e.detail}</span> : null}</span>
                    </span>
                    <span className="shrink-0 text-[11px] whitespace-nowrap text-muted-foreground">{e.actorName ?? t.unknownActor} · {fmt.format(new Date(e.createdAt))}</span>
                  </>
                );
                return (
                  <li key={e.id} className="border-b border-border/60 pb-2 last:border-0 last:pb-0">
                    {e.href
                      ? <Link href={e.href} className="flex items-baseline justify-between gap-3 hover:underline">{body}</Link>
                      : <span className="flex items-baseline justify-between gap-3">{body}</span>}
                  </li>
                );
              })}
            </ul>
          )}
      </CardContent>
    </Card>
  );
}
