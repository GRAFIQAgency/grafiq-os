"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/config/currencies";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";
import type { Currency } from "@/types/database";

import { recordRecurringPayment } from "../actions/payments";
import { deleteRecurringCost, saveRecurringCost, setRecurringActive } from "../actions/recurring";
import { monthlyEquivalent } from "../calculations/recurring";
import { FREQUENCIES, RECURRING_CATEGORIES } from "../constants";
import type { FinanceAccount, RecurringCost } from "../types";
import { Field, NativeSelect } from "./form-bits";
import { PaymentForm } from "./payment-form";

/** Recurring overheads: one definition each; the forecast expands occurrences. Paying advances next due. */
export function RecurringCosts({ costs, accounts, defaultCurrency, today }: { costs: RecurringCost[]; accounts: FinanceAccount[]; defaultCurrency: string; today: string }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.recurring;
  const [editing, setEditing] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const done = () => { setEditing(null); setPaying(null); router.refresh(); };
  const perMonth = CURRENCIES.map((c) => ({ currency: c, amount: costs.filter((x) => x.isActive && x.currency === c).reduce((s, x) => s + monthlyEquivalent(x.amount, x.frequency), 0) })).filter((x) => x.amount > 0);

  const form = (c: RecurringCost | null) => (
    <form key={c?.id ?? "new"} className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); const raw = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await saveRecurringCost(c?.id ?? null, raw); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) done(); }); }}>
      <Field name="name" label={t.name} error={fieldErrors.name} className="col-span-2"><Input id="name" name="name" defaultValue={c?.name ?? ""} required /></Field>
      <Field name="category" label={t.category}><NativeSelect name="category" defaultValue={c?.category ?? "software"} options={RECURRING_CATEGORIES.map((v) => ({ value: v, label: t.categories[v] }))} /></Field>
      <Field name="amount" label={t.amount} error={fieldErrors.amount}><Input id="amount" name="amount" type="number" step="any" min={0} defaultValue={c?.amount ?? ""} className="text-right tabular-nums" required /></Field>
      <Field name="currency" label={dict.finance.common.currency} error={fieldErrors.currency}><NativeSelect name="currency" defaultValue={c?.currency ?? defaultCurrency} options={CURRENCIES.map((x) => ({ value: x, label: x }))} className={c ? "pointer-events-none opacity-60" : undefined} /></Field>
      <Field name="frequency" label={t.frequency}><NativeSelect name="frequency" defaultValue={c?.frequency ?? "monthly"} options={FREQUENCIES.map((v) => ({ value: v, label: t.frequencies[v] }))} /></Field>
      <Field name="nextDueDate" label={t.nextDue} error={fieldErrors.nextDueDate}><Input id="nextDueDate" name="nextDueDate" type="date" defaultValue={c?.nextDueDate ?? today} required /></Field>
      <Field name="notes" label={dict.finance.common.notes} className="col-span-2 md:col-span-3"><Input id="notes" name="notes" defaultValue={c?.notes ?? ""} /></Field>
      <div className="col-span-2 flex items-end gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{dict.finance.common.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>{dict.finance.common.cancel}</Button>
        {message ? <span className="text-xs text-destructive">{message}</span> : null}
      </div>
    </form>
  );

  return (
    <DetailSection title={t.title} action={<Button size="sm" variant={editing === "new" ? "ghost" : "default"} onClick={() => setEditing(editing === "new" ? null : "new")} data-guide="finance-add-recurring"><Plus data-icon="inline-start" />{t.add}</Button>}>
      <div className="space-y-4" data-guide="finance-recurring">
        <p className="text-xs text-muted-foreground">{t.description}</p>
        {perMonth.length ? <p className="text-sm">{t.perMonth}: {perMonth.map((x) => <span key={x.currency} className="mr-3 font-semibold tabular-nums">{formatMoney(x.amount, x.currency, locale)}</span>)}</p> : null}
        {editing === "new" ? form(null) : null}
        {costs.length === 0 && editing !== "new" ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
          <ul className="divide-y divide-border/60">
            {costs.map((c) => editing === c.id ? <li key={c.id} className="py-3">{form(c)}</li> : (
              <li key={c.id} className={cn("space-y-2 py-3", !c.isActive && "opacity-60")}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{c.name} <span className="text-xs font-normal text-muted-foreground">· {t.categories[c.category]} · {t.frequencies[c.frequency]}{!c.isActive ? ` · ${t.inactive}` : ""}</span></p>
                    <p className="text-xs text-muted-foreground">{t.nextDue} <span className={cn(c.isActive && c.nextDueDate < today && "text-red-400")}>{formatDate(c.nextDueDate, locale)}</span>{c.frequency !== "monthly" ? ` · ${interpolate(t.monthlyEquivalent, { amount: formatMoney(monthlyEquivalent(c.amount, c.frequency), c.currency, locale) })}` : ""}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-base font-semibold tabular-nums">{formatMoney(c.amount, c.currency, locale)}</span>
                    {c.isActive ? <Button size="xs" variant="outline" onClick={() => setPaying(paying === c.id ? null : c.id)} data-guide="finance-recurring-paid">{t.markPaid}</Button> : null}
                    <Button size="xs" variant="ghost" onClick={() => setEditing(c.id)}>{dict.finance.common.edit}</Button>
                    <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { await setRecurringActive(c.id, !c.isActive); router.refresh(); })}>{c.isActive ? t.deactivate : t.activate}</Button>
                    <Button size="xs" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => { if (window.confirm(dict.finance.common.confirmDelete)) start(async () => { const r = await deleteRecurringCost(c.id); if (r.error) window.alert(r.error); router.refresh(); }); }}>{dict.finance.common.delete}</Button>
                  </div>
                </div>
                {paying === c.id ? <PaymentForm title={`${dict.finance.payment.sent} · ${c.name} (${formatDate(c.nextDueDate, locale)})`} outstanding={c.amount} currency={c.currency as Currency} accounts={accounts} today={today} onSubmit={(raw) => recordRecurringPayment(c.id, raw)} onDone={done} onCancel={() => setPaying(null)} /> : null}
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground">{t.paidHint}</p>
      </div>
    </DetailSection>
  );
}
