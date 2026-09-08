import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import type { TimelineEvent } from "../types";

function EventRow({ event, dict, locale }: { event: TimelineEvent; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.timeline;
  return (
    <li>
      <Link href={event.href} className="flex items-baseline justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/40">
        <span className="min-w-0">
          <span className="line-clamp-1 text-sm">{event.title}</span>
          <span className="line-clamp-1 text-[11px] text-muted-foreground">
            {t.kinds[event.kind]}{event.subject ? ` · ${event.subject}` : ""}{event.overdue ? ` · ${t.overdue}` : ""}
          </span>
        </span>
        <span className="flex shrink-0 items-baseline gap-2 text-xs tabular-nums">
          {event.value ? <span className="text-muted-foreground">{formatMoney(event.value.amount, event.value.currency, locale)}</span> : null}
          <span className={cn(event.overdue ? "font-medium text-red-400" : "text-muted-foreground")}>{formatDate(event.date, locale)}</span>
        </span>
      </Link>
    </li>
  );
}

/** Dated events that already exist in the modules — no calendar of its own. */
export function TimelineCard({ timeline, dict, locale }: { timeline: { today: TimelineEvent[]; week: TimelineEvent[] }; dict: Dictionary; locale: Locale }) {
  const t = dict.dashboard.timeline;
  const empty = timeline.today.length === 0 && timeline.week.length === 0;
  return (
    <Card className="gap-4" data-guide="dashboard-timeline">
      <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
      <CardContent>
        {empty ? <p className="rounded-md border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{t.empty}</p> : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{t.today} <span className="font-normal tabular-nums">({timeline.today.length})</span></h3>
              {timeline.today.length ? <ul className="-mx-2">{timeline.today.map((e) => <EventRow key={e.id} event={e} dict={dict} locale={locale} />)}</ul> : <p className="px-0.5 text-sm text-muted-foreground">—</p>}
            </section>
            <section className="space-y-1.5">
              <h3 className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">{t.week} <span className="font-normal tabular-nums">({timeline.week.length})</span></h3>
              {timeline.week.length ? <ul className="-mx-2">{timeline.week.map((e) => <EventRow key={e.id} event={e} dict={dict} locale={locale} />)}</ul> : <p className="px-0.5 text-sm text-muted-foreground">—</p>}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
