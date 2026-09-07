"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Currency } from "@/types/database";

import { deleteDirectCost, saveChangeRequest, saveDirectCost, setChangeRequestStatus } from "../actions/financials";
import { COST_CATEGORIES } from "../constants";
import type { ChangeRequest, DirectCost } from "../types";
import { NativeSelect } from "./form-primitives";

export function DirectCostsPanel({ projectId, currency, costs }: { projectId: string; currency: Currency; costs: DirectCost[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.projects.financials;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <DetailSection title={t.directCosts} action={<Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} data-guide="projects-add-cost"><Plus data-icon="inline-start" />{t.addCost}</Button>}>
      <p className="mb-3 text-xs text-muted-foreground">{t.directCostsHint}</p>
      {open ? (
        <form className="mb-4 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; start(async () => { const r = await saveDirectCost(projectId, currency, Object.fromEntries(new FormData(f).entries())); setError(r.error ?? null); if (!r.error) { f.reset(); setOpen(false); router.refresh(); } }); }}>
          <Input name="label" placeholder={t.costLabel} required />
          <NativeSelect name="category" defaultValue="other" options={COST_CATEGORIES.map((c) => ({ value: c, label: t.categories[c] }))} />
          <Input name="estimatedCost" type="number" min={0} step="any" placeholder={t.estimatedCost} className="text-right tabular-nums" />
          <Input name="actualCost" type="number" min={0} step="any" placeholder={t.actualCost} className="text-right tabular-nums" />
          <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : dict.projects.work.save}</Button>
          <Input name="note" placeholder={t.note} className="sm:col-span-5" />
          {error ? <p className="text-xs text-destructive sm:col-span-5">{error}</p> : null}
        </form>
      ) : null}
      {costs.length === 0 ? <p className="text-sm text-muted-foreground">{t.noCosts}</p> : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground"><tr className="[&>th]:py-1.5 [&>th]:text-left [&>th]:font-medium"><th>{t.costLabel}</th><th>{t.category}</th><th className="text-right!">{t.estimatedCost}</th><th className="text-right!">{t.actualCost}</th><th /></tr></thead>
          <tbody>
            {costs.map((c) => (
              <tr key={c.id} className="border-t border-border/60">
                <td className="py-1.5">{c.label}{c.note ? <span className="block text-[11px] text-muted-foreground">{c.note}</span> : null}</td>
                <td className="py-1.5 text-xs text-muted-foreground">{t.categories[c.category]}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(c.estimatedCost, c.currency, locale)}</td>
                <td className="py-1.5 text-right tabular-nums">{formatMoney(c.actualCost, c.currency, locale)}</td>
                <td className="py-1.5 text-right"><Button type="button" variant="ghost" size="icon-sm" aria-label={dict.projects.work.delete} className="text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm(dict.projects.work.confirmDelete)) start(async () => { await deleteDirectCost(c.id); router.refresh(); }); }}><Trash2 /></Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DetailSection>
  );
}

const CR_TONE = { draft: "discovered", sent: "shortlisted", approved: "approved", rejected: "rejected" } as const;

export function ChangeRequestsPanel({ projectId, currency, changes }: { projectId: string; currency: Currency; changes: ChangeRequest[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.projects.financials;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const act = (id: string, status: ChangeRequest["status"]) => start(async () => { await setChangeRequestStatus(projectId, id, status); router.refresh(); });
  return (
    <DetailSection title={t.changeRequests} action={<Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)} data-guide="projects-add-change"><Plus data-icon="inline-start" />{t.addChange}</Button>}>
      <p className="mb-3 text-xs text-muted-foreground">{t.changeRequestsHint}</p>
      {open ? (
        <form className="mb-4 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; start(async () => { const r = await saveChangeRequest(projectId, Object.fromEntries(new FormData(f).entries())); setError(r.error ?? null); if (!r.error) { f.reset(); setOpen(false); router.refresh(); } }); }}>
          <Input name="title" placeholder={t.changeTitle} required />
          <Input name="additionalRevenue" type="number" min={0} step="any" placeholder={t.additionalRevenue} className="text-right tabular-nums" />
          <Input name="additionalDirectCost" type="number" min={0} step="any" placeholder={t.additionalCost} className="text-right tabular-nums" />
          <Input name="deadlineImpactDays" type="number" placeholder={t.deadlineImpact} className="text-right tabular-nums" />
          <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : dict.projects.work.save}</Button>
          <Textarea name="description" rows={2} placeholder={dict.projects.work.description} className="sm:col-span-5" />
          {error ? <p className="text-xs text-destructive sm:col-span-5">{error}</p> : null}
        </form>
      ) : null}
      {changes.length === 0 ? <p className="text-sm text-muted-foreground">{t.noChanges}</p> : (
        <ul className="space-y-2">
          {changes.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-md border px-3 py-2 text-sm">
              <StatusBadge status={CR_TONE[c.status]} label={t.crStatuses[c.status]} />
              <span className="min-w-0 flex-1 font-medium">{c.title}</span>
              <span className="text-xs tabular-nums text-muted-foreground">+{formatMoney(c.additionalRevenue, currency, locale)} / {formatMoney(c.additionalDirectCost, currency, locale)}{c.deadlineImpactDays ? ` · +${c.deadlineImpactDays} d` : ""}</span>
              <span className="flex gap-1">
                {c.status === "draft" ? <Button size="xs" variant="outline" disabled={pending} onClick={() => act(c.id, "sent")}>{t.send}</Button> : null}
                {c.status !== "approved" ? <Button size="xs" disabled={pending} onClick={() => act(c.id, "approved")} data-guide="projects-approve-change">{t.approve}</Button> : null}
                {c.status === "sent" || c.status === "draft" ? <Button size="xs" variant="ghost" disabled={pending} onClick={() => act(c.id, "rejected")}>{t.reject}</Button> : null}
                {c.status === "approved" || c.status === "rejected" ? <Button size="xs" variant="ghost" disabled={pending} onClick={() => act(c.id, "draft")}>{t.reopen}</Button> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
    </DetailSection>
  );
}
