import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/config";

import type { CompanySignal } from "../../types";

const TONE = { high: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400", medium: "border-amber-500/30 bg-amber-500/10 text-amber-400", low: "text-muted-foreground" } as const;

export function SignalChips({ signals, dict, max = 3 }: { signals: CompanySignal[]; dict: Dictionary; max?: number }) {
  const labels = dict.sourcing.companies.signalTypes as Record<string, string>;
  if (!signals.length) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {signals.slice(0, max).map((s) => (
        <span key={s.id} className={cn("inline-flex h-5 items-center rounded-full border px-2 text-[11px] font-medium", TONE[s.strength])} title={s.description ?? undefined}>
          {labels[s.type] ?? s.type.replace(/_/g, " ")}
        </span>
      ))}
      {signals.length > max ? <span className="text-[11px] text-muted-foreground">+{signals.length - max}</span> : null}
    </div>
  );
}

export function SignalsTable({ signals, dict, formatDate }: { signals: CompanySignal[]; dict: Dictionary; formatDate: (iso: string) => string }) {
  const t = dict.sourcing.companies;
  const labels = t.signalTypes as Record<string, string>;
  if (!signals.length) return <p className="text-sm text-muted-foreground">{t.noSignals}</p>;
  return (
    <ul className="space-y-2 text-sm">
      {signals.map((s) => (
        <li key={s.id} className="rounded-md border px-3 py-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium", TONE[s.strength])}>
              {labels[s.type] ?? s.type}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.signalStrength[s.strength]} · {t.confidence} {Math.round(s.confidence * 100)} % · {t.detected} {formatDate(s.detectedAt)}{s.sourceId ? ` · ${s.sourceId}` : ""}
            </span>
          </div>
          {s.description ? <p className="mt-1 text-xs text-muted-foreground">{s.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}
