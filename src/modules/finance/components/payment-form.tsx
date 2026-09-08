"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import type { Currency } from "@/types/database";

import type { ActionResult, FinanceAccount } from "../types";
import { Field, NativeSelect } from "./form-bits";

/** Record a (partial) payment against a receivable / payable / recurring cost. */
export function PaymentForm({ title, outstanding, currency, accounts, today, onSubmit, onDone, onCancel, anchor }: {
  title: string; outstanding: number; currency: Currency; accounts: FinanceAccount[]; today: string;
  onSubmit: (raw: Record<string, FormDataEntryValue>) => Promise<ActionResult>; onDone: () => void; onCancel: () => void; anchor?: string;
}) {
  const { dict, locale } = useI18n();
  const t = dict.finance.payment;
  const [amount, setAmount] = useState(String(outstanding));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const mine = accounts.filter((a) => a.currency === currency && a.isActive);
  return (
    <form className="grid grid-cols-2 gap-3 rounded-md border bg-muted/20 p-3 md:grid-cols-5" data-guide={anchor}
      onSubmit={(e) => { e.preventDefault(); const raw = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await onSubmit(raw); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) onDone(); }); }}>
      <p className="col-span-2 text-sm font-medium md:col-span-5">{title} <span className="text-xs font-normal text-muted-foreground">· {interpolate(t.outstandingHint, { amount: formatMoney(outstanding, currency, locale) })}</span></p>
      <Field name="amount" label={`${t.amount} (${currency})`} error={fieldErrors.amount}>
        <div className="flex gap-1">
          <Input id="amount" name="amount" type="number" step="any" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} className="text-right tabular-nums" autoFocus />
          <Button type="button" size="xs" variant="ghost" onClick={() => setAmount(String(outstanding))}>{t.full}</Button>
        </div>
      </Field>
      <Field name="occurredAt" label={t.date} error={fieldErrors.occurredAt}><Input id="occurredAt" name="occurredAt" type="date" defaultValue={today} /></Field>
      <Field name="accountId" label={t.account}><NativeSelect name="accountId" defaultValue={mine[0]?.id ?? ""} placeholder={t.noAccount} options={mine.map((a) => ({ value: a.id, label: a.name }))} /></Field>
      <Field name="note" label={t.note} className="col-span-2 md:col-span-1"><Input id="note" name="note" /></Field>
      <div className="col-span-2 flex items-end gap-2 md:col-span-1">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{t.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{dict.finance.common.cancel}</Button>
      </div>
      <p className="col-span-2 text-[11px] text-muted-foreground md:col-span-5">{t.partialHint}{message ? <span className="ml-2 text-destructive">{message}</span> : null}</p>
    </form>
  );
}
