"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { recordReceivablePayment } from "../actions/payments";
import { deleteReceivable, setReceivableCancelled } from "../actions/receivables";
import { groupByBucket } from "../calculations/status";
import type { FinancePickers } from "../queries";
import type { ReceivableView } from "../types";
import { BUCKET_TONE, ItemStatusBadge } from "./finance-badges";
import { PaymentForm } from "./payment-form";
import { ReceivableForm } from "./receivable-form";

/** Operational receivables list grouped OVERDUE / DUE SOON / UPCOMING / PAID with inline record-payment / edit / cancel. */
export function ReceivablesList({ items, pickers, today, filtered = false, compact = false, projectId = null, showProject = true }: {
  items: ReceivableView[]; pickers: Pick<FinancePickers, "projects" | "clients" | "settings" | "accounts">; today: string; filtered?: boolean; compact?: boolean; projectId?: string | null; showProject?: boolean;
}) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.receivables;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [pending, start] = useTransition();
  const done = () => { setAdding(false); setEditing(null); setPaying(null); router.refresh(); };
  const visible = showCancelled ? items : items.filter((r) => r.state !== "cancelled");
  const groups = groupByBucket(visible);
  const projectHref = (id: string) => `${getModule("finance").href}/projects/${id}`;

  return (
    <div className="space-y-4" data-guide="finance-receivables">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" className="size-3.5" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />{dict.finance.common.showCancelled}</label>
        <Button size="sm" variant={adding ? "ghost" : "default"} onClick={() => setAdding((v) => !v)} data-guide="finance-add-receivable"><Plus data-icon="inline-start" />{t.add}</Button>
      </div>
      {adding ? <ReceivableForm item={null} pickers={pickers} defaultProjectId={projectId} today={today} onDone={done} onCancel={() => setAdding(false)} /> : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">{filtered ? t.noMatch : t.empty}</p>
          {!filtered ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t.emptyHint}</p> : null}
        </div>
      ) : groups.map(({ bucket, items: rows }) => (
        <section key={bucket} className="space-y-2">
          <h3 className={cn("text-xs font-semibold tracking-wide uppercase", BUCKET_TONE[bucket])}>{dict.finance.buckets[bucket]} <span className="font-normal text-muted-foreground tabular-nums">({rows.length})</span></h3>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {rows.map((r) => (
              <li key={r.id} className="space-y-2 px-3 py-2.5">
                <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{r.label}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {[r.clientName, showProject && r.projectId ? <Link key="p" href={projectHref(r.projectId)} className="hover:underline">{r.projectName}</Link> : showProject ? r.projectName : null, r.invoiceReference ? `${t.columns.invoice} ${r.invoiceReference}` : null].filter(Boolean).map((x, i) => <span key={i}>{i ? " · " : ""}{x}</span>)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 text-xs xl:w-[340px] xl:shrink-0 xl:text-right">
                    <span><span className="block text-muted-foreground">{t.columns.amount}</span><span className="tabular-nums">{formatMoney(r.amount, r.currency, locale)}</span></span>
                    <span><span className="block text-muted-foreground">{t.columns.received}</span><span className="tabular-nums">{formatMoney(r.received, r.currency, locale)}</span></span>
                    <span><span className="block text-muted-foreground">{t.columns.outstanding}</span><span className={cn("font-semibold tabular-nums", r.status === "overdue" && "text-red-400")}>{formatMoney(r.outstanding, r.currency, locale)}</span></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:w-[300px] xl:shrink-0 xl:justify-end">
                    <span className={cn("text-xs tabular-nums", r.status === "overdue" ? "text-red-400" : "text-muted-foreground")}>{formatDate(r.dueDate, locale)}{r.daysOverdue ? ` · ${interpolate(dict.finance.common.days, { n: r.daysOverdue })}` : ""}</span>
                    <ItemStatusBadge status={r.status} dict={dict} />
                    {r.state === "open" && r.outstanding > 0 ? <Button size="xs" variant="outline" onClick={() => { setPaying(paying === r.id ? null : r.id); setEditing(null); }} data-guide="finance-record-payment">{t.recordPayment}</Button> : null}
                    {!compact ? <Button size="xs" variant="ghost" onClick={() => { setEditing(editing === r.id ? null : r.id); setPaying(null); }}>{dict.finance.common.edit}</Button> : null}
                    {r.state === "open" ? (
                      <Button size="xs" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => { if (r.received > 0 ? window.confirm(dict.finance.common.confirmCancel) : true) start(async () => { const res = r.received > 0 ? await setReceivableCancelled(r.id, true) : await deleteReceivable(r.id); if (res.error) window.alert(res.error); router.refresh(); }); }}>{r.received > 0 ? t.waive : dict.finance.common.delete}</Button>
                    ) : <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { await setReceivableCancelled(r.id, false); router.refresh(); })}>{t.restore}</Button>}
                  </div>
                </div>
                {paying === r.id ? <PaymentForm title={dict.finance.payment.received} outstanding={r.outstanding} currency={r.currency} accounts={pickers.accounts} today={today} onSubmit={(raw) => recordReceivablePayment(r.id, raw)} onDone={done} onCancel={() => setPaying(null)} anchor="finance-payment-form" /> : null}
                {editing === r.id ? <ReceivableForm item={r} pickers={pickers} today={today} onDone={done} onCancel={() => setEditing(null)} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
