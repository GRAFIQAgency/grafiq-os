"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CURRENCIES } from "@/config/currencies";
import { useI18n } from "@/lib/i18n/client";
import type { Currency } from "@/types/database";

import { deleteRoleCost, saveRoleCost, setRoleCostActive } from "../actions";
import type { RoleCost } from "../types";

interface RoleCostsTableProps {
  roles: RoleCost[];
  defaultCurrency: Currency;
}

interface RoleRow {
  key: string;
  id?: string;
  name: string;
  hourlyCost: string;
  currency: Currency;
  isActive: boolean;
  dirty: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

function newKey() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}

function toRow(role: RoleCost): RoleRow {
  return {
    key: role.id,
    id: role.id,
    name: role.name,
    hourlyCost: String(role.hourlyCost),
    currency: role.currency,
    isActive: role.isActive,
    dirty: false,
  };
}

export function RoleCostsTable({ roles, defaultCurrency }: RoleCostsTableProps) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.settings.roles;
  const [rows, setRows] = useState<RoleRow[]>(() => roles.map(toRow));
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function patch(key: string, changes: Partial<RoleRow>) {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }

  function edit(key: string, changes: Partial<RoleRow>) {
    patch(key, { ...changes, dirty: true, error: undefined, fieldErrors: undefined });
  }

  function addRow() {
    setRows((prev) => [
      ...prev,
      { key: newKey(), name: "", hourlyCost: "", currency: defaultCurrency, isActive: true, dirty: true },
    ]);
  }

  function run(key: string, work: () => Promise<void>) {
    setBusyKey(key);
    startTransition(async () => {
      try {
        await work();
      } finally {
        setBusyKey(null);
      }
    });
  }

  function save(row: RoleRow) {
    run(row.key, async () => {
      const result = await saveRoleCost({
        id: row.id,
        name: row.name,
        hourlyCost: row.hourlyCost,
        currency: row.currency,
        isActive: row.isActive,
      });
      if (result.error) {
        patch(row.key, { error: result.error, fieldErrors: result.fieldErrors });
        return;
      }
      patch(row.key, { id: result.id, dirty: false, error: undefined, fieldErrors: undefined });
      router.refresh();
    });
  }

  function toggleActive(row: RoleRow) {
    if (!row.id) {
      edit(row.key, { isActive: !row.isActive });
      return;
    }
    const id = row.id;
    run(row.key, async () => {
      const result = await setRoleCostActive(id, !row.isActive);
      if (result.error) {
        patch(row.key, { error: result.error });
        return;
      }
      patch(row.key, { isActive: !row.isActive });
      router.refresh();
    });
  }

  function remove(row: RoleRow) {
    if (!row.id) {
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      return;
    }
    if (!window.confirm(t.confirmDelete)) return;
    const id = row.id;
    run(row.key, async () => {
      const result = await deleteRoleCost(id);
      if (result.error) {
        patch(row.key, { error: result.error });
        return;
      }
      setRows((prev) => prev.filter((r) => r.key !== row.key));
      router.refresh();
    });
  }

  return (
    <Card className="gap-4" data-guide="settings-roles">
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>{t.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>{t.name}</TableHead>
                <TableHead className="text-right">{t.hourlyCost}</TableHead>
                <TableHead>{t.currency}</TableHead>
                <TableHead>{t.status}</TableHead>
                <TableHead className="text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={5} className="h-20 text-center text-sm text-muted-foreground">
                    {t.empty}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const busy = busyKey === row.key;
                  return (
                    <TableRow key={row.key} className={cn("hover:bg-transparent", !row.isActive && "opacity-60")}>
                      <TableCell className="min-w-44 align-top">
                        <Input
                          value={row.name}
                          onChange={(e) => edit(row.key, { name: e.target.value })}
                          placeholder={t.namePlaceholder}
                          aria-label={t.name}
                          aria-invalid={Boolean(row.fieldErrors?.name)}
                        />
                        {row.error ? <p className="mt-1.5 text-xs text-destructive">{row.error}</p> : null}
                      </TableCell>
                      <TableCell className="align-top">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          value={row.hourlyCost}
                          onChange={(e) => edit(row.key, { hourlyCost: e.target.value })}
                          aria-label={t.hourlyCost}
                          aria-invalid={Boolean(row.fieldErrors?.hourlyCost)}
                          className="w-32 text-right tabular-nums"
                        />
                      </TableCell>
                      <TableCell className="align-top">
                        <Select value={row.currency} onValueChange={(c) => edit(row.key, { currency: c as Currency })}>
                          <SelectTrigger aria-label={t.currency} className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CURRENCIES.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex h-8 items-center gap-2">
                          {!row.id ? (
                            <Badge variant="outline" className="border-dashed text-muted-foreground">
                              {t.unsaved}
                            </Badge>
                          ) : row.isActive ? (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                              {t.active}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground">
                              {t.inactive}
                            </Badge>
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
                          {row.id ? (
                            <Button type="button" variant="ghost" size="sm" onClick={() => toggleActive(row)} disabled={busy}>
                              {row.isActive ? t.deactivate : t.activate}
                            </Button>
                          ) : null}
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => remove(row)}
                            disabled={busy}
                            aria-label={t.delete}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus data-icon="inline-start" />
          {t.add}
        </Button>
      </CardContent>
    </Card>
  );
}
