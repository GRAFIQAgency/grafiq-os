"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/config/currencies";
import { useI18n } from "@/lib/i18n/client";
import type { Currency } from "@/types/database";

import { savePayable } from "../actions/payables";
import { PAYABLE_CATEGORIES } from "../constants";
import type { FinancePickers } from "../queries";
import type { Payable, PayableCategory } from "../types";
import { Field, NativeSelect } from "./form-bits";

type Pickers = Pick<FinancePickers, "projects" | "clients" | "people" | "settings">;

export interface PayablePrefill {
  label?: string;
  amount?: number;
  currency?: Currency;
  projectId?: string | null;
  talentCandidateId?: string | null;
  payeeName?: string | null;
  category?: PayableCategory;
}

/** Add / edit one payable (project cost or company expense). The user always confirms amount and due date. */
export function PayableForm({ item, prefill, pickers, today, onDone, onCancel }: { item: Payable | null; prefill?: PayablePrefill; pickers: Pickers; today: string; onDone: () => void; onCancel: () => void }) {
  const { dict } = useI18n();
  const t = dict.finance.payables;
  const f = t.fields;
  const initialProject = pickers.projects.find((p) => p.id === (item?.projectId ?? prefill?.projectId));
  const [projectId, setProjectId] = useState(initialProject?.id ?? "");
  const [currency, setCurrency] = useState<Currency>(item?.currency ?? prefill?.currency ?? initialProject?.currency ?? pickers.settings.defaultCurrency);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const locked = Boolean(item);

  return (
    <form className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-4" data-guide="finance-payable-form"
      onSubmit={(e) => { e.preventDefault(); const raw = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await savePayable(item?.id ?? null, { ...raw, projectId, currency }); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? null); if (!r.error && !r.fieldErrors) onDone(); }); }}>
      <Field name="label" label={f.label} error={fieldErrors.label} className="col-span-2"><Input id="label" name="label" defaultValue={item?.label ?? prefill?.label ?? ""} required /></Field>
      <Field name="amount" label={f.amount} error={fieldErrors.amount}><Input id="amount" name="amount" type="number" step="any" min={0} defaultValue={item?.amount ?? prefill?.amount ?? ""} className="text-right tabular-nums" required /></Field>
      <Field name="currency" label={dict.finance.common.currency} error={fieldErrors.currency}><NativeSelect name="currency" value={currency} onChange={(v) => setCurrency(v as Currency)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} className={locked ? "pointer-events-none opacity-60" : undefined} /></Field>
      <Field name="dueDate" label={f.dueDate} error={fieldErrors.dueDate}><Input id="dueDate" name="dueDate" type="date" defaultValue={item?.dueDate ?? today} required /></Field>
      <Field name="category" label={f.category}><NativeSelect name="category" defaultValue={item?.category ?? prefill?.category ?? "freelancer"} options={PAYABLE_CATEGORIES.map((c) => ({ value: c, label: t.categories[c] }))} /></Field>
      <Field name="projectId" label={f.project} className="col-span-2">
        <NativeSelect name="projectId" value={projectId} placeholder={t.companyExpense} onChange={(v) => { setProjectId(v); const p = pickers.projects.find((x) => x.id === v); if (p && !locked) setCurrency(p.currency); }} options={pickers.projects.map((p) => ({ value: p.id, label: `${p.name}${p.clientName ? ` · ${p.clientName}` : ""} (${p.currency})` }))} />
      </Field>
      <Field name="talentCandidateId" label={f.person}><NativeSelect name="talentCandidateId" defaultValue={item?.talentCandidateId ?? prefill?.talentCandidateId ?? ""} placeholder={f.noPerson} options={pickers.people.map((p) => ({ value: p.id, label: `${p.name}${p.role ? ` · ${p.role}` : ""}` }))} /></Field>
      <Field name="supplierId" label={f.supplier}><NativeSelect name="supplierId" defaultValue={item?.supplierId ?? ""} placeholder={f.noSupplier} options={pickers.clients.map((c) => ({ value: c.id, label: c.name }))} /></Field>
      <Field name="payeeName" label={f.payee}><Input id="payeeName" name="payeeName" defaultValue={item?.payeeName ?? prefill?.payeeName ?? ""} /></Field>
      <Field name="notes" label={f.notes}><Input id="notes" name="notes" defaultValue={item?.notes ?? ""} /></Field>
      <div className="col-span-2 flex items-end gap-2 md:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{dict.finance.common.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{dict.finance.common.cancel}</Button>
        {message ? <span className="text-xs text-destructive">{message}</span> : null}
      </div>
    </form>
  );
}
