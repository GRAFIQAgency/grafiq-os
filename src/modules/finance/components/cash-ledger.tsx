"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/config/currencies";
import { formatDate, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

import { recordCashEvent, voidCashEvent } from "../actions/payments";
import type { CashEvent, FinanceAccount } from "../types";
import { Field, NativeSelect } from "./form-bits";

/** Ledger-style history of actual cash movements. Wrong entries are voided, never deleted. */
export function CashLedger({ events, accounts, defaultCurrency, today }: { events: CashEvent[]; accounts: FinanceAccount[]; defaultCurrency: string; today: string }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.ledger;
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <DetailSection title={t.title} action={<Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}><Plus data-icon="inline-start" />{t.add}</Button>}>
      <div className="space-y-4" data-guide="finance-ledger">
        <p className="text-xs text-muted-foreground">{t.description}</p>
        {open ? (
          <form className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; const raw = Object.fromEntries(new FormData(f).entries()); start(async () => { const r = await recordCashEvent(raw); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) { f.reset(); setOpen(false); router.refresh(); } }); }}>
            <p className="col-span-2 text-[11px] text-muted-foreground md:col-span-6">{t.addHint}</p>
            <Field name="direction" label={t.direction}><NativeSelect name="direction" defaultValue="out" options={[{ value: "in", label: t.in }, { value: "out", label: t.out }]} /></Field>
            <Field name="amount" label={dict.finance.common.amount} error={fieldErrors.amount}><Input id="amount" name="amount" type="number" step="any" min={0} className="text-right tabular-nums" required /></Field>
            <Field name="currency" label={dict.finance.common.currency} error={fieldErrors.currency}><NativeSelect name="currency" defaultValue={defaultCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></Field>
            <Field name="occurredAt" label={dict.finance.payment.date} error={fieldErrors.occurredAt}><Input id="occurredAt" name="occurredAt" type="date" defaultValue={today} /></Field>
            <Field name="accountId" label={t.account}><NativeSelect name="accountId" placeholder={dict.finance.payment.noAccount} options={accounts.filter((a) => a.isActive).map((a) => ({ value: a.id, label: `${a.name} (${a.currency})` }))} /></Field>
            <Field name="label" label={t.label} error={fieldErrors.label}><Input id="label" name="label" required /></Field>
            <div className="col-span-2 flex items-end gap-2 md:col-span-6">
              <Button type="submit" size="sm" disabled={pending}>{dict.finance.payment.save}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.finance.common.cancel}</Button>
              {message ? <span className="text-xs text-destructive">{message}</span> : null}
            </div>
          </form>
        ) : null}
        {events.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
          <ul className="divide-y divide-border/60">
            {events.map((e) => (
              <li key={e.id} className={cn("flex items-start justify-between gap-3 py-2 text-sm", e.voidedAt && "opacity-50")}>
                <div className="min-w-0">
                  <p className={cn("line-clamp-1 font-medium", e.voidedAt && "line-through")}>{e.label}</p>
                  <p className="text-xs text-muted-foreground">{t.kinds[e.kind]} · {formatDate(e.occurredAt, locale)}{e.accountName ? ` · ${e.accountName}` : ""}{e.note ? ` · ${e.note}` : ""}{e.voidedAt ? ` · ${t.voided}${e.voidReason ? `: ${e.voidReason}` : ""}` : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className={cn("font-semibold tabular-nums", e.direction === "in" ? "text-emerald-400" : "")}>{e.direction === "in" ? "+" : "−"}{formatMoney(e.amount, e.currency, locale)}</span>
                  {!e.voidedAt ? <Button size="xs" variant="ghost" className="text-muted-foreground" disabled={pending} onClick={() => { const reason = window.prompt(t.voidReason); if (reason === null) return; start(async () => { await voidCashEvent(e.id, reason); router.refresh(); }); }}>{t.void}</Button> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailSection>
  );
}
