"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";

import { setSourceEnabled, testSource } from "../../actions/sources";
import type { SourceState } from "../../types";

export function SourcesTable({ sources, registered }: { sources: SourceState[]; registered: Set<string> | string[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.sourcing.sources;
  const [busy, setBusy] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const [, start] = useTransition();
  const known = new Set(registered);
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });

  const run = (id: string, work: () => Promise<void>) => {
    setBusy(id);
    start(async () => {
      try {
        await work();
      } finally {
        setBusy(null);
        router.refresh();
      }
    });
  };

  return (
    <div className="overflow-x-auto rounded-md border" data-guide="sources-table">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>{t.name}</TableHead>
            <TableHead>{t.type}</TableHead>
            <TableHead>{t.entities}</TableHead>
            <TableHead>{t.status}</TableHead>
            <TableHead>{t.lastRun}</TableHead>
            <TableHead className="text-right">{t.records}</TableHead>
            <TableHead>{t.rateLimit}</TableHead>
            <TableHead>{t.errors}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((s) => {
            const isBusy = busy === s.id;
            const inDb = known.has(s.id);
            return (
              <TableRow key={s.id} className="hover:bg-transparent">
                <TableCell className="font-medium">
                  {s.name}
                  <span className="block text-xs text-muted-foreground">{s.id}</span>
                </TableCell>
                <TableCell><Badge variant="outline">{s.type}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.supportedEntityTypes.join(", ")}</TableCell>
                <TableCell>
                  {s.enabled ? (
                    <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400">{t.enabled}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">{t.disabled}</Badge>
                  )}
                  {!inDb ? <span className="block text-xs text-amber-400">{t.notInDb}</span> : null}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.lastRunAt ? fmt.format(new Date(s.lastRunAt)) : t.none}</TableCell>
                <TableCell className="text-right tabular-nums">{s.recordsCollected}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{s.rateLimit ? interpolate(t.perMinute, { n: s.rateLimit.requestsPerMinute }) : t.none}</TableCell>
                <TableCell className="max-w-48 text-xs">
                  {s.lastError ? <span className="text-red-400">{s.lastError}</span> : <span className="text-muted-foreground">{t.none}</span>}
                  {testResults[s.id] ? <span className="block text-muted-foreground">{testResults[s.id]}</span> : null}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button size="xs" variant="ghost" disabled={isBusy} onClick={() => run(s.id, async () => {
                      const r = await testSource(s.id);
                      setTestResults((prev) => ({ ...prev, [s.id]: `${r.ok ? t.testOk : t.testFailed}${r.message ? ` — ${r.message}` : ""}` }));
                    })}>
                      {isBusy ? <Loader2 className="animate-spin" /> : null}
                      {t.test}
                    </Button>
                    <Button size="xs" variant="outline" disabled={isBusy} onClick={() => run(s.id, async () => { await setSourceEnabled(s.id, !s.enabled); })}>
                      {s.enabled ? t.disable : t.enable}
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
