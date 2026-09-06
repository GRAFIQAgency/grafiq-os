import type { Dictionary } from "@/lib/i18n/config";
import { INTL_LOCALES, type Locale } from "@/lib/i18n/config";

import type { SourceRecordSummary } from "../../types";

export function SourceRecords({ records, dict, locale }: { records: SourceRecordSummary[]; dict: Dictionary; locale: Locale }) {
  const t = dict.sourcing.common;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  if (!records.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="space-y-3">
      {records.map((r) => {
        const conflicts = Array.isArray(r.payload.conflicts) ? (r.payload.conflicts as { field: string; existing: unknown; incoming: unknown }[]) : [];
        return (
          <div key={r.id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="font-medium">{r.sourceId} <span className="text-muted-foreground">· {r.sourceEntityId}</span></span>
              <span className="text-xs text-muted-foreground">{fmt.format(new Date(r.retrievedAt))}</span>
            </div>
            {r.sourceUrl ? (
              <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline-offset-2 hover:underline">
                {t.viewSource}: {r.sourceUrl}
              </a>
            ) : null}
            {conflicts.length ? (
              <ul className="mt-2 space-y-0.5 text-xs text-amber-400">
                {conflicts.map((c) => (
                  <li key={c.field}>{c.field}: {String(c.existing)} ≠ {String(c.incoming)}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">{t.conflicts}</p>
    </div>
  );
}
