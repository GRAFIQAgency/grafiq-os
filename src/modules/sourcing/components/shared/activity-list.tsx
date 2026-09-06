import type { Dictionary } from "@/lib/i18n/config";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";

import type { ActivityEntry } from "../../types";

export function ActivityList({ entries, dict, locale }: { entries: ActivityEntry[]; dict: Dictionary; locale: Locale }) {
  const t = dict.sourcing.common;
  if (!entries.length) return <p className="text-sm text-muted-foreground">{t.noActivity}</p>;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  const labels = t.actions as Record<string, string>;
  return (
    <ul className="space-y-2 text-sm">
      {entries.map((e) => {
        const detail = Object.entries(e.details).filter(([, v]) => v !== undefined && v !== null && typeof v !== "object").map(([k, v]) => `${k}: ${String(v)}`).join(", ");
        return (
          <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border/60 pb-2">
            <span>
              {labels[e.action] ?? e.action}
              {detail ? <span className="text-muted-foreground"> · {detail}</span> : null}
            </span>
            <span className="text-xs text-muted-foreground">{e.actorName ?? "—"} · {fmt.format(new Date(e.createdAt))}</span>
          </li>
        );
      })}
    </ul>
  );
}
