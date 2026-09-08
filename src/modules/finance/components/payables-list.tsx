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

import { deletePayable, setPayableCancelled } from "../actions/payables";
import { recordPayablePayment } from "../actions/payments";
import { groupByBucket } from "../calculations/status";
import type { FinancePickers } from "../queries";
import type { PayableView } from "../types";
import { BUCKET_TONE, ItemStatusBadge } from "./finance-badges";
import { PayableForm, type PayablePrefill } from "./payable-form";
import { PaymentForm } from "./payment-form";

/** Operational payables list grouped by due bucket with inline record-payment / edit / cancel. */
export function PayablesList({ items, pickers, today, filtered = false, compact = false, prefill, onPrefillConsumed, showProject = true, addLabel }: {
  items: PayableView[]; pickers: Pick<FinancePickers, "projects" | "clients" | "people" | "settings" | "accounts">; today: string; filtered?: boolean; compact?: boolean;
  prefill?: PayablePrefill | null; onPrefillConsumed?: () => void; showProject?: boolean; addLabel?: string;
}) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.payables;
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [pending, start] = useTransition();
  const done = () => { setAdding(false); setEditing(null); setPaying(null); onPrefillConsumed?.(); router.refresh(); };
  const visible = showCancelled ? items : items.filter((p) => p.state !== "cancelled");
  const groups = groupByBucket(visible);
  const projectHref = (id: string) => `${getModule("finance").href}/projects/${id}`;
  const showForm = adding || Boolean(prefill);

  return (
    <div className="space-y-4" data-guide="finance-payables">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" className="size-3.5" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />{dict.finance.common.showCancelled}</label>
        <Button size="sm" variant={showForm ? "ghost" : "default"} onClick={() => { if (showForm) { setAdding(false); onPrefillConsumed?.(); } else setAdding(true); }} data-guide="finance-add-payable"><Plus data-icon="inline-start" />{addLabel ?? t.add}</Button>
      </div>
      {showForm ? <PayableForm key={prefill ? `${prefill.talentCandidateId ?? prefill.payeeName}-${prefill.amount}` : "new"} item={null} prefill={prefill ?? undefined} pickers={pickers} today={today} onDone={done} onCancel={() => { setAdding(false); onPrefillConsumed?.(); }} /> : null}

      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed px-6 py-10 text-center">
          <p className="text-sm font-medium">{filtered ? t.noMatch : t.empty}</p>
          {!filtered ? <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{t.emptyHint}</p> : null}
        </div>
      ) : groups.map(({ bucket, items: rows }) => (
        <section key={bucket} className="space-y-2">
          <h3 className={cn("text-xs font-semibold tracking-wide uppercase", BUCKET_TONE[bucket])}>{dict.finance.buckets[bucket]} <span className="font-normal text-muted-foreground tabular-nums">({rows.length})</span></h3>
          <ul className="divide-y divide-border/60 rounded-lg border">
            {rows.map((p) => (
              <li key={p.id} className="space-y-2 px-3 py-2.5">
                <div className="flex flex-col gap-1.5 xl:flex-row xl:items-center xl:justify-between xl:gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-medium">{p.payeeName ? `${p.payeeName} · ` : ""}{p.label}</p>
                    <p className="line-clamp-1 text-xs text-muted-foreground">
                      {t.categories[p.category]}{showProject ? <> · {p.projectId ? <Link href={projectHref(p.projectId)} className="hover:underline">{p.projectName}</Link> : t.companyExpense}</> : null}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-x-4 text-xs xl:w-[340px] xl:shrink-0 xl:text-right">
                    <span><span className="block text-muted-foreground">{t.columns.amount}</span><span className="tabular-nums">{formatMoney(p.amount, p.currency, locale)}</span></span>
                    <span><span className="block text-muted-foreground">{t.columns.paid}</span><span className="tabular-nums">{formatMoney(p.paid, p.currency, locale)}</span></span>
                    <span><span className="block text-muted-foreground">{t.columns.outstanding}</span><span className={cn("font-semibold tabular-nums", p.status === "overdue" && "text-red-400")}>{formatMoney(p.outstanding, p.currency, locale)}</span></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:w-[300px] xl:shrink-0 xl:justify-end">
                    <span className={cn("text-xs tabular-nums", p.status === "overdue" ? "text-red-400" : "text-muted-foreground")}>{formatDate(p.dueDate, locale)}{p.daysOverdue ? ` · ${interpolate(dict.finance.common.days, { n: p.daysOverdue })}` : ""}</span>
                    <ItemStatusBadge status={p.status} dict={dict} />
                    {p.state === "open" && p.outstanding > 0 ? <Button size="xs" variant="outline" onClick={() => { setPaying(paying === p.id ? null : p.id); setEditing(null); }} data-guide="finance-record-payment-out">{t.recordPayment}</Button> : null}
                    {!compact ? <Button size="xs" variant="ghost" onClick={() => { setEditing(editing === p.id ? null : p.id); setPaying(null); }}>{dict.finance.common.edit}</Button> : null}
                    {p.state === "open" ? (
                      <Button size="xs" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => { if (p.paid > 0 ? window.confirm(dict.finance.common.confirmCancel) : true) start(async () => { const res = p.paid > 0 ? await setPayableCancelled(p.id, true) : await deletePayable(p.id); if (res.error) window.alert(res.error); router.refresh(); }); }}>{p.paid > 0 ? t.cancel : dict.finance.common.delete}</Button>
                    ) : <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { await setPayableCancelled(p.id, false); router.refresh(); })}>{t.restore}</Button>}
                  </div>
                </div>
                {paying === p.id ? <PaymentForm title={dict.finance.payment.sent} outstanding={p.outstanding} currency={p.currency} accounts={pickers.accounts} today={today} onSubmit={(raw) => recordPayablePayment(p.id, raw)} onDone={done} onCancel={() => setPaying(null)} anchor="finance-payment-form" /> : null}
                {editing === p.id ? <PayableForm item={p} pickers={pickers} today={today} onDone={done} onCancel={() => setEditing(null)} /> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
