"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/config/currencies";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Currency } from "@/types/database";

import { saveReceivable } from "../actions/receivables";
import { grossAmount } from "../calculations/schedule";
import type { FinancePickers } from "../queries";
import type { Receivable } from "../types";
import { Field, NativeSelect } from "./form-bits";

type Pickers = Pick<FinancePickers, "projects" | "clients" | "settings">;

/** Add / edit one receivable. Net + VAT rate → gross expected in the bank (VAT is cash visibility only). */
export function ReceivableForm({ item, pickers, defaultProjectId, today, onDone, onCancel }: { item: Receivable | null; pickers: Pickers; defaultProjectId?: string | null; today: string; onDone: () => void; onCancel: () => void }) {
  const { dict, locale } = useI18n();
  const t = dict.finance.receivables;
  const f = t.fields;
  const initialProject = pickers.projects.find((p) => p.id === (item?.projectId ?? defaultProjectId));
  const [projectId, setProjectId] = useState(initialProject?.id ?? "");
  const [currency, setCurrency] = useState<Currency>(item?.currency ?? initialProject?.currency ?? pickers.settings.defaultCurrency);
  const [net, setNet] = useState(item ? String(item.netAmount) : "");
  const [vat, setVat] = useState(item ? String(item.vatRate) : String(pickers.settings.vatRate));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const gross = grossAmount(Number(net) || 0, Number(vat) || 0);
  const projectCurrencyLocked = Boolean(item) || Boolean(pickers.projects.find((p) => p.id === projectId));

  return (
    <form className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-4" data-guide="finance-receivable-form"
      onSubmit={(e) => { e.preventDefault(); const raw = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await saveReceivable(item?.id ?? null, { ...raw, projectId, currency }); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) onDone(); }); }}>
      <Field name="label" label={f.label} error={fieldErrors.label} className="col-span-2"><Input id="label" name="label" defaultValue={item?.label ?? ""} required /></Field>
      <Field name="projectId" label={dict.finance.common.project} className="col-span-2">
        <NativeSelect name="projectId" value={projectId} placeholder={dict.finance.common.noProject} onChange={(v) => { setProjectId(v); const p = pickers.projects.find((x) => x.id === v); if (p) setCurrency(p.currency); }} options={pickers.projects.map((p) => ({ value: p.id, label: `${p.name}${p.clientName ? ` · ${p.clientName}` : ""} (${p.currency})` }))} />
      </Field>
      {!projectId ? (
        <>
          <Field name="clientId" label={dict.finance.common.client}><NativeSelect name="clientId" defaultValue={item?.clientId ?? ""} placeholder={dict.finance.common.noClient} options={pickers.clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
          <Field name="clientName" label={f.clientName}><Input id="clientName" name="clientName" defaultValue={item?.clientName ?? ""} /></Field>
        </>
      ) : null}
      <Field name="netAmount" label={f.netAmount} error={fieldErrors.netAmount}><Input id="netAmount" name="netAmount" type="number" step="any" min={0} value={net} onChange={(e) => setNet(e.target.value)} className="text-right tabular-nums" required /></Field>
      <Field name="vatRate" label={f.vatRate} error={fieldErrors.vatRate}><Input id="vatRate" name="vatRate" type="number" step="any" min={0} max={100} value={vat} onChange={(e) => setVat(e.target.value)} className="text-right tabular-nums" /></Field>
      <Field name="currency" label={f.currency} error={fieldErrors.currency}>
        <NativeSelect name="currency" value={currency} onChange={(v) => setCurrency(v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} className={projectCurrencyLocked ? "pointer-events-none opacity-60" : undefined} />
      </Field>
      <div>
        <p className="mb-1 text-xs text-muted-foreground">{f.gross}</p>
        <p className="h-8 leading-8 font-semibold tabular-nums">{formatMoney(gross, currency, locale)}</p>
      </div>
      <Field name="dueDate" label={f.dueDate} error={fieldErrors.dueDate}><Input id="dueDate" name="dueDate" type="date" defaultValue={item?.dueDate ?? today} required /></Field>
      <Field name="expectedDate" label={f.expectedDate} error={fieldErrors.expectedDate}><Input id="expectedDate" name="expectedDate" type="date" defaultValue={item?.expectedDate ?? ""} /></Field>
      <Field name="invoiceReference" label={f.invoiceReference}><Input id="invoiceReference" name="invoiceReference" defaultValue={item?.invoiceReference ?? ""} /></Field>
      <Field name="invoiceSentAt" label={f.invoiceSentAt} error={fieldErrors.invoiceSentAt}><Input id="invoiceSentAt" name="invoiceSentAt" type="date" defaultValue={item?.invoiceSentAt ?? ""} /></Field>
      <Field name="percentOfContract" label={f.percent} error={fieldErrors.percentOfContract}><Input id="percentOfContract" name="percentOfContract" type="number" step="any" min={0} max={100} defaultValue={item?.percentOfContract ?? ""} className="text-right tabular-nums" /></Field>
      <Field name="notes" label={f.notes} className="col-span-2 md:col-span-3"><Input id="notes" name="notes" defaultValue={item?.notes ?? ""} /></Field>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{dict.finance.common.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{dict.finance.common.cancel}</Button>
        {message ? <span className="text-xs text-destructive">{message}</span> : null}
      </div>
    </form>
  );
}
