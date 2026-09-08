"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import type { Currency } from "@/types/database";

import { addPersonWithRate, setPersonRate, type AddPersonResult } from "../actions";
import { PRICING_MODELS } from "../constants";
import type { PricingModel, TalentCapacityRecord } from "../types";

interface PeopleRatesTableProps {
  people: TalentCapacityRecord[];
  /** Role names from Business Settings, offered as suggestions. */
  roleNames: string[];
  defaultCurrency: Currency;
}

interface PersonRow {
  key: string;
  id?: string;
  fullName: string;
  role: string;
  pricingModel: PricingModel;
  hourlyCost: string;
  fixedPrice: string;
  marginPercent: string;
  unitPrice: string;
  unitLabel: string;
  currency: Currency;
  fromSourcing: boolean;
  dirty: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));
const num = (v: number | null) => (v == null ? "" : String(v));

function toRow(p: TalentCapacityRecord, defaultCurrency: Currency): PersonRow {
  return {
    key: p.id, id: p.id, fullName: p.fullName, role: p.role ?? "", pricingModel: p.pricingModel,
    hourlyCost: num(p.hourlyCost), fixedPrice: num(p.fixedPrice), marginPercent: num(p.marginPercent), unitPrice: num(p.unitPrice), unitLabel: p.unitLabel ?? "",
    currency: p.costCurrency ?? defaultCurrency, fromSourcing: p.hourlyCost != null && !p.costIsPersonSpecific, dirty: false,
  };
}

/** The value that matters for the row's pay model (drives the status badge). */
function rateValue(row: PersonRow): string {
  return row.pricingModel === "fixed" ? row.fixedPrice : row.pricingModel === "percent" ? row.marginPercent : row.pricingModel === "unit" ? row.unitPrice : row.hourlyCost;
}

/**
 * Per-person pay model and rate. Rows are Talent Bench people (the shared
 * person record); this table edits role, pay model and the matching value —
 * the same fields the Talent detail page edits. Pricing and Projects read them.
 */
export function PeopleRatesTable({ people, roleNames, defaultCurrency }: PeopleRatesTableProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.talent.people;
  const [rows, setRows] = useState<PersonRow[]>(() => people.map((p) => toRow(p, defaultCurrency)));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const listId = "people-rates-roles";

  const patch = (key: string, changes: Partial<PersonRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...changes } : r)));
  const edit = (key: string, changes: Partial<PersonRow>) => patch(key, { ...changes, dirty: true, error: undefined, fieldErrors: undefined });

  function run(key: string, work: () => Promise<void>) {
    setBusyKey(key);
    startTransition(async () => {
      try { await work(); } finally { setBusyKey(null); }
    });
  }

  function save(row: PersonRow) {
    run(row.key, async () => {
      const input = {
        fullName: row.fullName, role: row.role, pricingModel: row.pricingModel, hourlyCost: row.hourlyCost,
        costCurrency: row.currency, fixedPrice: row.fixedPrice, marginPercent: row.marginPercent, unitPrice: row.unitPrice, unitLabel: row.unitLabel,
      };
      const result: AddPersonResult = row.id ? await setPersonRate(row.id, input) : await addPersonWithRate(input);
      if (result.error) {
        patch(row.key, { error: result.error, fieldErrors: result.fieldErrors });
        return;
      }
      patch(row.key, { id: row.id ?? result.id, dirty: false, fromSourcing: false });
      router.refresh();
    });
  }

  const sorted = [...rows].sort((a, b) => (a.id && b.id ? a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName) : a.id ? -1 : b.id ? 1 : 0));

  const amountInput = (row: PersonRow) => {
    const field: "hourlyCost" | "fixedPrice" | "marginPercent" | "unitPrice" = row.pricingModel === "fixed" ? "fixedPrice" : row.pricingModel === "percent" ? "marginPercent" : row.pricingModel === "unit" ? "unitPrice" : "hourlyCost";
    const suffix = row.pricingModel === "percent" ? "%" : row.pricingModel === "fixed" ? row.currency : row.pricingModel === "unit" ? `${row.currency}/${row.unitLabel.trim() || t.unitShort}` : `${row.currency}/h`;
    return (
      <div className="relative">
        <Input
          type="number" inputMode="decimal" min={0} max={field === "marginPercent" ? 100 : undefined} step="any"
          value={row[field]} onChange={(e) => edit(row.key, { [field]: e.target.value })}
          aria-label={t[field]} aria-invalid={Boolean(row.fieldErrors?.[field])}
          placeholder={row.pricingModel === "fixed" ? t.fixedPlaceholder : "0"}
          className="w-36 pr-12 text-right tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">{suffix}</span>
      </div>
    );
  };

  return (
    <Card className="gap-4" data-guide="settings-people">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <datalist id={listId}>{roleNames.map((r) => <option key={r} value={r} />)}</datalist>
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t.person}</TableHead>
                <TableHead>{t.role}</TableHead>
                <TableHead>{t.paid}</TableHead>
                <TableHead className="text-right">{t.amount}</TableHead>
                <TableHead>{t.currency}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="h-20 text-center text-sm text-muted-foreground">{t.empty}</TableCell>
                </TableRow>
              ) : sorted.map((row) => {
                const busy = busyKey === row.key;
                return (
                  <TableRow key={row.key} className="hover:bg-transparent">
                    <TableCell className="min-w-44 align-top">
                      {row.id ? (
                        <div className="flex h-8 items-center">
                          <Link href={`${getModule("talent").href}/${row.id}`} className="font-medium hover:underline">{row.fullName}</Link>
                        </div>
                      ) : (
                        <Input value={row.fullName} onChange={(e) => edit(row.key, { fullName: e.target.value })} placeholder={t.namePlaceholder} aria-label={t.person} aria-invalid={Boolean(row.fieldErrors?.fullName)} autoFocus />
                      )}
                      {row.error ? <p className="mt-1.5 text-xs text-destructive">{row.error}</p> : null}
                    </TableCell>
                    <TableCell className="min-w-40 align-top">
                      <Input list={listId} value={row.role} onChange={(e) => edit(row.key, { role: e.target.value })} placeholder={t.rolePlaceholder} aria-label={t.role} />
                    </TableCell>
                    <TableCell className="align-top">
                      <Select value={row.pricingModel} onValueChange={(m) => edit(row.key, { pricingModel: m as PricingModel })}>
                        <SelectTrigger aria-label={t.paid} className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>{PRICING_MODELS.map((m) => <SelectItem key={m} value={m}>{t.models[m]}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top">
                      {amountInput(row)}
                      {row.pricingModel === "unit" ? (
                        <Input value={row.unitLabel} onChange={(e) => edit(row.key, { unitLabel: e.target.value })} placeholder={t.unitLabelPlaceholder} aria-label={t.unitLabel} className="mt-1 w-36 text-xs" maxLength={30} />
                      ) : null}
                      {row.pricingModel === "fixed" ? <p className="mt-1 text-[11px] text-muted-foreground">{t.fixedHint}</p> : null}
                      {row.pricingModel === "percent" ? <p className="mt-1 text-[11px] text-muted-foreground">{t.percentHint}</p> : null}
                    </TableCell>
                    <TableCell className="align-top">
                      <Select value={row.currency} onValueChange={(c) => edit(row.key, { currency: c as Currency })}>
                        <SelectTrigger aria-label={t.currency} className="w-24"><SelectValue /></SelectTrigger>
                        <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex h-8 items-center">
                        {!row.id ? (
                          <Badge variant="outline" className="border-dashed text-muted-foreground">{t.unsaved}</Badge>
                        ) : rateValue(row) === "" ? (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">{row.pricingModel === "hourly" ? t.noRate : t.setPerProject}</Badge>
                        ) : row.pricingModel === "hourly" && row.fromSourcing ? (
                          <Badge variant="outline" className="text-muted-foreground">{t.fromSourcing}</Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">{t.ownRate}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <div className="flex items-center justify-end gap-1">
                        {row.dirty ? (
                          <Button type="button" size="sm" onClick={() => save(row)} disabled={busy}>
                            {busy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                            {t.save}
                          </Button>
                        ) : null}
                        {!row.id ? (
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => setRows((prev) => prev.filter((r) => r.key !== row.key))} aria-label={t.discard} className="text-muted-foreground hover:text-foreground"><X /></Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { key: newKey(), fullName: "", role: "", pricingModel: "hourly", hourlyCost: "", fixedPrice: "", marginPercent: "", unitPrice: "", unitLabel: "", currency: defaultCurrency, fromSourcing: false, dirty: true }])}>
            <Plus data-icon="inline-start" />
            {t.add}
          </Button>
          <Link href={getModule("talent").href} className="text-xs text-muted-foreground hover:text-foreground hover:underline">{t.manageInTalent}</Link>
        </div>
      </CardContent>
    </Card>
  );
}
