"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Play, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { deleteSavedSearch, runSavedSearch } from "../../actions/search";
import { companyFiltersToParams, describeFilters, talentFiltersToParams } from "../../services/filters";
import type { CompanyFilters, SavedSearch, TalentFilters } from "../../types";

export function SavedSearchesTable({ searches }: { searches: SavedSearch[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.sourcing.searches;
  const [busy, setBusy] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [, start] = useTransition();
  const base = getModule("sourcing").href;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });

  const openHref = (s: SavedSearch) =>
    s.entityType === "talent"
      ? `${base}/talent?${talentFiltersToParams(s.filters as TalentFilters).toString()}`
      : `${base}/companies?${companyFiltersToParams(s.filters as CompanyFilters).toString()}`;

  if (!searches.length) {
    return <div className="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground" data-guide="searches-table">{t.empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-md border" data-guide="searches-table">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t.name}</TableHead>
            <TableHead>{t.type}</TableHead>
            <TableHead>{t.filters}</TableHead>
            <TableHead>{t.lastRun}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {searches.map((s) => {
            const isBusy = busy === s.id;
            return (
              <TableRow key={s.id} className="hover:bg-transparent">
                <TableCell className="font-medium">
                  {s.name}
                  {messages[s.id] ? <span className="block text-xs text-muted-foreground">{messages[s.id]}</span> : null}
                </TableCell>
                <TableCell><Badge variant="outline">{s.entityType === "talent" ? dict.sourcing.tabs.talent : dict.sourcing.tabs.companies}</Badge></TableCell>
                <TableCell className="max-w-md text-xs text-muted-foreground">{describeFilters(s.filters as Record<string, unknown>).join(" · ") || "—"}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.lastRunAt ? fmt.format(new Date(s.lastRunAt)) : t.never}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Link href={openHref(s)} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.open}</Link>
                    <Button size="xs" variant="outline" disabled={isBusy} onClick={() => {
                      setBusy(s.id);
                      start(async () => {
                        const r = await runSavedSearch(s.id);
                        setMessages((m) => ({ ...m, [s.id]: r.error ?? (r.run ? interpolate(dict.sourcing.search.lastRun, { new: r.run.resultsNew, dup: r.run.resultsDuplicates, sources: r.run.sourcesCompleted }) : "") }));
                        setBusy(null);
                        router.refresh();
                      });
                    }}>
                      {isBusy ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Play data-icon="inline-start" />}
                      {t.run}
                    </Button>
                    <Button size="icon-xs" variant="ghost" aria-label={t.delete} disabled={isBusy} className="text-muted-foreground hover:text-destructive" onClick={() => {
                      if (!window.confirm(t.confirmDelete)) return;
                      setBusy(s.id);
                      start(async () => { await deleteSavedSearch(s.id); setBusy(null); router.refresh(); });
                    }}>
                      <Trash2 />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
