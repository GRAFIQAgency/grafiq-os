"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types/database";

import { generatePaymentSchedule } from "../actions/receivables";
import { round2 } from "../calculations/dates";
import { generateSchedule, grossAmount } from "../calculations/schedule";

interface Line { label: string; percent: string; netAmount: string; dueDate: string }

/**
 * GENERATE PAYMENT SCHEDULE: prefilled from the contract value and the
 * Business Settings payment terms; the user edits and confirms. Saved rows
 * are a snapshot owned by the project.
 */
export function ScheduleGenerator({ projectId, contractValue, currency, terms, vatRate, vatDefault, startDate, endDate, compact = false }: {
  projectId: string; contractValue: number; currency: Currency; terms: number[]; vatRate: number; vatDefault: boolean; startDate: string; endDate: string | null; compact?: boolean;
}) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.project;
  const [open, setOpen] = useState(!compact);
  const [applyVat, setApplyVat] = useState(vatDefault && vatRate > 0);
  const [vat, setVat] = useState(String(vatRate));
  const [lines, setLines] = useState<Line[]>(() =>
    generateSchedule(contractValue, terms, { vatRate, applyVat: false, startDate, endDate, label: (i, pct) => interpolate(t.lineLabel, { n: i + 1, percent: pct }) }).map((l) => ({ label: l.label, percent: String(l.percent), netAmount: String(l.netAmount), dueDate: l.dueDate }))
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const effectiveVat = applyVat ? Number(vat) || 0 : 0;
  const sum = useMemo(() => round2(lines.reduce((s, l) => s + (Number(l.netAmount) || 0), 0)), [lines]);
  const money = (v: number) => formatMoney(v, currency, locale);
  const update = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const setPercent = (i: number, percent: string) => update(i, { percent, netAmount: String(round2((contractValue * (Number(percent) || 0)) / 100)) });

  if (!open) return <Button size="sm" onClick={() => setOpen(true)} data-guide="finance-generate-schedule"><CalendarPlus data-icon="inline-start" />{t.generate}</Button>;

  return (
    <form className="space-y-3 rounded-md border p-3" data-guide="finance-generate-schedule"
      onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await generatePaymentSchedule(projectId, { applyVat, vatRate: vat, lines }); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) { setOpen(false); router.refresh(); } }); }}>
      <p className="text-sm font-medium">{t.generateTitle}</p>
      <p className="text-xs text-muted-foreground">{interpolate(t.generateHint, { contract: money(contractValue) })}</p>
      <p className="text-xs text-muted-foreground">{interpolate(t.termsSource, { terms: terms.map((x) => `${x} %`).join(" / ") })}</p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-4" checked={applyVat} onChange={(e) => setApplyVat(e.target.checked)} data-guide="finance-apply-vat" />{t.applyVat}</label>
        {applyVat ? <label className="flex items-center gap-2 text-sm">{t.vatRate}<Input type="number" step="any" min={0} max={100} value={vat} onChange={(e) => setVat(e.target.value)} className="h-7 w-20 text-right tabular-nums" /></label> : null}
        {fieldErrors.vatRate ? <span className="text-xs text-destructive">{fieldErrors.vatRate}</span> : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead className="text-xs text-muted-foreground"><tr className="[&>th]:py-1 [&>th]:text-left [&>th]:font-medium"><th>{dict.finance.receivables.fields.label}</th><th className="w-20">{t.percent}</th><th className="w-36 text-right!">{t.net}</th><th className="w-36 text-right!">{t.gross}</th><th className="w-40">{t.dueDate}</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} className="[&>td]:py-1 [&>td]:pr-2">
                <td><Input value={l.label} onChange={(e) => update(i, { label: e.target.value })} className="h-8" aria-invalid={Boolean(fieldErrors[`lines.${i}.label`])} /></td>
                <td><Input type="number" step="any" min={0} max={100} value={l.percent} onChange={(e) => setPercent(i, e.target.value)} className="h-8 text-right tabular-nums" /></td>
                <td><Input type="number" step="any" min={0} value={l.netAmount} onChange={(e) => update(i, { netAmount: e.target.value })} className="h-8 text-right tabular-nums" aria-invalid={Boolean(fieldErrors[`lines.${i}.netAmount`])} /></td>
                <td className="text-right tabular-nums">{money(grossAmount(Number(l.netAmount) || 0, effectiveVat))}</td>
                <td><Input type="date" value={l.dueDate} onChange={(e) => update(i, { dueDate: e.target.value })} className="h-8" aria-invalid={Boolean(fieldErrors[`lines.${i}.dueDate`])} /></td>
                <td><Button type="button" size="icon-sm" variant="ghost" aria-label={t.removeLine} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}><X /></Button></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t text-sm [&>td]:py-1.5 [&>td]:pr-2">
              <td className="font-medium">{t.total}</td>
              <td className="tabular-nums">{round2(lines.reduce((s, l) => s + (Number(l.percent) || 0), 0))} %</td>
              <td className={cn("text-right font-semibold tabular-nums", sum !== contractValue && "text-amber-400")}>{money(sum)}</td>
              <td className="text-right font-semibold tabular-nums">{money(grossAmount(sum, effectiveVat))}</td>
              <td colSpan={2}><Button type="button" size="xs" variant="ghost" onClick={() => setLines((ls) => [...ls, { label: interpolate(t.lineLabel, { n: ls.length + 1, percent: 0 }), percent: "0", netAmount: "0", dueDate: ls.at(-1)?.dueDate ?? startDate }])}><Plus data-icon="inline-start" />{t.addLine}</Button></td>
            </tr>
          </tfoot>
        </table>
      </div>
      {sum !== contractValue ? <p className="text-xs text-amber-400">{interpolate(t.totalMismatch, { sum: money(sum), contract: money(contractValue) })}</p> : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !lines.length}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <CalendarPlus data-icon="inline-start" />}{interpolate(t.create, { n: lines.length })}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.finance.common.cancel}</Button>
        {message || fieldErrors.lines ? <span className="text-xs text-destructive">{message ?? fieldErrors.lines}</span> : null}
      </div>
      <p className="text-[11px] text-muted-foreground">{t.snapshotNote}</p>
    </form>
  );
}
