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

import { saveAccount, setAccountActive, updateAccountBalance } from "../actions/accounts";
import { ACCOUNT_TYPES } from "../constants";
import type { CashPosition, FinanceAccount } from "../types";
import { Field, NativeSelect } from "./form-bits";

/** Cash / bank accounts with a manually maintained balance; the forecast starts here. */
export function AccountsPanel({ accounts, positions, defaultCurrency, today }: { accounts: FinanceAccount[]; positions: CashPosition[]; defaultCurrency: string; today: string }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.finance.accounts;
  const [editing, setEditing] = useState<string | null>(null); // "new" | account id
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const staleDays = (a: FinanceAccount) => positions.find((p) => p.currency === a.currency)?.accounts.find((x) => x.id === a.id)?.stale ? Math.round((new Date(today).getTime() - new Date(a.balanceAsOf).getTime()) / 86_400_000) : 0;

  const submit = (id: string | null, form: HTMLFormElement) => {
    const data = Object.fromEntries(new FormData(form).entries());
    start(async () => {
      const r = await saveAccount(id, data);
      setFieldErrors(r.fieldErrors ?? {});
      setMessage(r.error ?? null);
      if (!r.error && !r.fieldErrors) { setEditing(null); router.refresh(); }
    });
  };

  const form = (a: FinanceAccount | null) => (
    <form key={a?.id ?? "new"} className="grid grid-cols-2 gap-3 rounded-md border p-3 md:grid-cols-6" onSubmit={(e) => { e.preventDefault(); submit(a?.id ?? null, e.currentTarget); }}>
      <Field name="name" label={t.name} error={fieldErrors.name} className="col-span-2"><Input id="name" name="name" defaultValue={a?.name ?? ""} required /></Field>
      <Field name="currency" label={dict.finance.common.currency} error={fieldErrors.currency}><NativeSelect name="currency" defaultValue={a?.currency ?? defaultCurrency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></Field>
      <Field name="type" label={t.type}><NativeSelect name="type" defaultValue={a?.type ?? "bank"} options={ACCOUNT_TYPES.map((v) => ({ value: v, label: t.types[v] }))} /></Field>
      <Field name="currentBalance" label={t.balance} error={fieldErrors.currentBalance}><Input id="currentBalance" name="currentBalance" type="number" step="any" defaultValue={a?.currentBalance ?? ""} className="text-right tabular-nums" /></Field>
      <Field name="balanceAsOf" label={t.asOf} error={fieldErrors.balanceAsOf}><Input id="balanceAsOf" name="balanceAsOf" type="date" defaultValue={a?.balanceAsOf ?? today} /></Field>
      <Field name="notes" label={dict.finance.common.notes} className="col-span-2 md:col-span-4"><Input id="notes" name="notes" defaultValue={a?.notes ?? ""} /></Field>
      <div className="col-span-2 flex items-end gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{dict.finance.common.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>{dict.finance.common.cancel}</Button>
      </div>
    </form>
  );

  return (
    <DetailSection title={t.title} action={<Button size="sm" variant="outline" onClick={() => setEditing(editing === "new" ? null : "new")} data-guide="finance-add-account"><Plus data-icon="inline-start" />{t.add}</Button>}>
      <div className="space-y-4" data-guide="finance-accounts">
        <p className="text-xs text-muted-foreground">{t.description}</p>
        {message ? <p className="text-xs text-destructive">{message}</p> : null}
        {editing === "new" ? form(null) : null}
        {positions.filter((p) => !p.unknown).length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {positions.filter((p) => !p.unknown).map((p) => (
              <div key={p.currency} className="rounded-lg border px-4 py-3">
                <p className="text-xs text-muted-foreground">{t.available} · {p.currency}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{formatMoney(p.available, p.currency, locale)}</p>
                {p.adjustments ? <p className="text-[11px] text-muted-foreground">{interpolate(t.adjustments, { amount: formatMoney(p.adjustments, p.currency, locale) })}</p> : null}
              </div>
            ))}
          </div>
        ) : null}
        {accounts.length === 0 && editing !== "new" ? <p className="text-sm text-muted-foreground">{t.noAccounts}</p> : (
          <ul className="divide-y divide-border/60">
            {accounts.map((a) => editing === a.id ? <li key={a.id} className="py-3">{form(a)}</li> : (
              <li key={a.id} className={cn("flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between", !a.isActive && "opacity-60")}>
                <div className="min-w-0">
                  <p className="font-medium">{a.name} <span className="text-xs font-normal text-muted-foreground">· {t.types[a.type]} · {a.currency}{!a.isActive ? ` · ${t.archived}` : ""}</span></p>
                  <p className="text-xs text-muted-foreground">
                    {t.asOf} {formatDate(a.balanceAsOf, locale)}
                    {a.isActive && staleDays(a) > 0 ? <span className="ml-2 text-amber-400">{interpolate(t.stale, { days: staleDays(a) })}</span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-semibold tabular-nums">{formatMoney(a.currentBalance, a.currency, locale)}</span>
                  <QuickBalance account={a} today={today} onDone={() => router.refresh()} />
                  <Button size="xs" variant="ghost" onClick={() => setEditing(a.id)}>{dict.finance.common.edit}</Button>
                  <Button size="xs" variant="ghost" disabled={pending} onClick={() => start(async () => { await setAccountActive(a.id, !a.isActive); router.refresh(); })}>{a.isActive ? t.archive : t.restore}</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DetailSection>
  );
}

function QuickBalance({ account, today, onDone }: { account: FinanceAccount; today: string; onDone: () => void }) {
  const { dict } = useI18n();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <Button size="xs" variant="outline" onClick={() => setOpen(true)} data-guide="finance-update-balance">{dict.finance.accounts.updateBalance}</Button>;
  return (
    <form className="flex flex-wrap items-center gap-1.5" onSubmit={(e) => { e.preventDefault(); const f = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await updateAccountBalance(account.id, { currentBalance: f.currentBalance, balanceAsOf: f.balanceAsOf }); setError(r.error ?? r.fieldErrors?.currentBalance ?? null); if (!r.error && !r.fieldErrors) { setOpen(false); onDone(); } }); }}>
      <Input name="currentBalance" type="number" step="any" defaultValue={account.currentBalance} className="h-7 w-32 text-right tabular-nums" autoFocus />
      <Input name="balanceAsOf" type="date" defaultValue={today} className="h-7 w-36" />
      <Button type="submit" size="xs" disabled={pending}>{dict.finance.common.save}</Button>
      <Button type="button" size="xs" variant="ghost" onClick={() => setOpen(false)}>{dict.finance.common.cancel}</Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </form>
  );
}
