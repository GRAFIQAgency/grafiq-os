"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, X } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { approvePendingAction, rejectPendingAction } from "../actions";
import type { PendingActionView } from "../queries";

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected: "text-muted-foreground",
};

/**
 * The approval queue. Every row shows the live "now" value next to what Hermes
 * proposes, so a decision never rests on what was true when the proposal was
 * made.
 */
export function PendingActions({ items, decided = false }: { items: PendingActionView[]; decided?: boolean }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.approvals;
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  const [busy, setBusy] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [, start] = useTransition();

  const decide = (id: string, run: () => Promise<{ error?: string }>) => {
    setBusy(id);
    start(async () => {
      try {
        const r = await run();
        setErrors((e) => ({ ...e, [id]: r.error ?? "" }));
        if (!r.error) router.refresh();
      } finally {
        setBusy(null);
      }
    });
  };

  // Values are domain codes; translate the ones this app already has words for.
  const translate = (field: string, value: string | null): string => {
    if (!value) return t.notSet;
    if (field === "status") return (dict.projects.statuses as Record<string, string>)[value] ?? value;
    if (field === "stage") return (dict.sales.stages as Record<string, string>)[value] ?? value;
    return value;
  };

  if (!items.length) {
    return (
      <div className="rounded-lg border border-dashed px-6 py-12 text-center">
        <p className="text-sm font-medium">{decided ? t.emptyDecided : t.empty}</p>
        {!decided ? <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">{t.emptyHint}</p> : null}
      </div>
    );
  }

  return (
    <ul className="space-y-3" data-guide="pending-list">
      {items.map(({ row, description }) => {
        const error = errors[row.id];
        const working = busy === row.id;
        return (
          <li key={row.id}>
            <Card className="gap-0 py-0">
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                      <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium", STATUS_TONE[row.status])}>
                        {t.statuses[row.status]}
                      </span>
                      <span className="text-xs font-normal text-muted-foreground">{t.actionTypes[row.action_type]}</span>
                      <span className="truncate">{description.targetLabel}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {interpolate(t.proposedBy, { name: row.proposed_by })} · {fmt.format(new Date(row.created_at))}
                      {row.decided_at ? ` · ${interpolate(t.decidedAt, { date: fmt.format(new Date(row.decided_at)) })}` : ""}
                    </p>
                  </div>
                  {description.targetHref ? (
                    <Link href={description.targetHref} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.openRecord}</Link>
                  ) : null}
                </div>

                {description.missing ? <p className="text-xs text-destructive">{t.missing}</p> : (
                  <dl className="grid gap-2 sm:grid-cols-2">
                    {description.changes.map((c) => (
                      <div key={c.field} className="rounded-md border px-3 py-2">
                        <dt className="text-[11px] text-muted-foreground">{(t.fields as Record<string, string>)[c.field] ?? c.field}</dt>
                        <dd className="mt-0.5 flex items-center gap-2 text-sm">
                          <span className="text-muted-foreground line-clamp-1">{translate(c.field, c.current)}</span>
                          <ArrowRight className="size-3 shrink-0 text-muted-foreground" />
                          <span className="line-clamp-1 font-medium">{translate(c.field, c.proposed)}</span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {row.reason ? <p className="text-xs text-muted-foreground"><span className="font-medium">{t.reason}:</span> {row.reason}</p> : null}
                {row.result && row.status !== "pending" ? <p className="text-xs text-muted-foreground"><span className="font-medium">{t.result}:</span> {row.result}</p> : null}
                {error ? <p className="text-xs text-destructive">{interpolate(t.refused, { message: error })}</p> : null}

                {row.status === "pending" ? (
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" disabled={working || description.missing} onClick={() => decide(row.id, () => approvePendingAction(row.id))}>
                      {working ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Check data-icon="inline-start" />}
                      {working ? t.working : t.approve}
                    </Button>
                    <Button size="sm" variant="ghost" disabled={working}
                      onClick={() => { if (window.confirm(t.confirmReject)) decide(row.id, () => rejectPendingAction(row.id)); }}>
                      <X data-icon="inline-start" />{t.reject}
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
