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
import type { TalentCapacityRecord } from "../types";

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
  hourlyCost: string;
  currency: Currency;
  fromSourcing: boolean;
  dirty: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random()));

function toRow(p: TalentCapacityRecord, defaultCurrency: Currency): PersonRow {
  return {
    key: p.id, id: p.id, fullName: p.fullName, role: p.role ?? "",
    hourlyCost: p.hourlyCost == null ? "" : String(p.hourlyCost), currency: p.costCurrency ?? defaultCurrency,
    fromSourcing: p.hourlyCost != null && !p.costIsPersonSpecific, dirty: false,
  };
}

/**
 * Per-person hourly rates. Rows are Talent Bench people (the shared person
 * record); this table only edits role + cost, the same fields the Talent
 * detail page edits. Pricing and Projects read these rates.
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
      const input = { fullName: row.fullName, role: row.role, hourlyCost: row.hourlyCost, costCurrency: row.currency };
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
                <TableHead className="text-right">{t.hourlyCost}</TableHead>
                <TableHead>{t.currency}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">{t.empty}</TableCell>
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
                      <Input type="number" inputMode="decimal" min={0} step="any" value={row.hourlyCost} onChange={(e) => edit(row.key, { hourlyCost: e.target.value })} aria-label={t.hourlyCost} aria-invalid={Boolean(row.fieldErrors?.hourlyCost)} className="w-32 text-right tabular-nums" />
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
                        ) : row.hourlyCost === "" ? (
                          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-400">{t.noRate}</Badge>
                        ) : row.fromSourcing ? (
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
          <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => [...prev, { key: newKey(), fullName: "", role: "", hourlyCost: "", currency: defaultCurrency, fromSourcing: false, dirty: true }])}>
            <Plus data-icon="inline-start" />
            {t.add}
          </Button>
          <Link href={getModule("talent").href} className="text-xs text-muted-foreground hover:text-foreground hover:underline">{t.manageInTalent}</Link>
        </div>
      </CardContent>
    </Card>
  );
}
