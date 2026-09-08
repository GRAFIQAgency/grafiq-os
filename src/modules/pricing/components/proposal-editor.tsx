"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Copy, ExternalLink, Loader2, Mail, MessageCircle, Plus, Save, Send, Trash2 } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { formatMoney } from "../format";
import { saveProposal, shareProposal } from "../proposals/actions";
import { itemAmount, newItemId, proposalTotals } from "../proposals/calculations";
import type { Proposal, ProposalItem } from "../proposals/types";

/**
 * Native editor for a pricing plan: edit the text and lines, save, then share
 * by public link (copy / WhatsApp / e-mail). Totals are derived live.
 */
export function ProposalEditor({ proposal, shareUrl, shareAvailable }: { proposal: Proposal; shareUrl: string; shareAvailable: boolean }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.pricing.proposal;
  const [title, setTitle] = useState(proposal.title);
  const [clientName, setClientName] = useState(proposal.clientName ?? "");
  const [intro, setIntro] = useState(proposal.intro ?? "");
  const [currency, setCurrency] = useState(proposal.currency);
  const [vatRate, setVatRate] = useState(String(proposal.vatRate));
  const [validUntil, setValidUntil] = useState(proposal.validUntil ?? "");
  const [notes, setNotes] = useState(proposal.notes ?? "");
  const [items, setItems] = useState<ProposalItem[]>(proposal.items);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pending, start] = useTransition();
  const [sharing, startShare] = useTransition();

  const totals = useMemo(() => proposalTotals(items, Number(vatRate.replace(",", ".")) || 0), [items, vatRate]);
  const money = (v: number) => formatMoney(v, currency, locale);
  const selectCls = "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";
  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); setMessage(null); };
  const patchItem = (id: string, patch: Partial<ProposalItem>) => { setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i))); setDirty(true); setMessage(null); };

  function save(then?: () => void) {
    start(async () => {
      const r = await saveProposal(proposal.id, { title, clientName, intro, currency, vatRate, validUntil, notes, items });
      setFieldErrors(r.fieldErrors ?? {});
      setMessage(r.error ?? t.saved);
      if (!r.error) { setDirty(false); router.refresh(); then?.(); }
    });
  }

  function share() {
    const publish = () => startShare(async () => {
      const r = await shareProposal(proposal.id);
      setMessage(r.error ?? t.share.sharedNow);
      if (!r.error) router.refresh();
    });
    if (dirty) save(publish);
    else publish();
  }

  const waText = interpolate(t.share.message, { title, url: shareUrl });
  const shared = proposal.status === "shared";
  const sharedOn = proposal.sharedAt ? new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" }).format(new Date(proposal.sharedAt)) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href={proposal.estimateId ? `${getModule("pricing").href}?estimate=${proposal.estimateId}` : getModule("pricing").href} className={buttonVariants({ variant: "ghost", size: "xs" })}>
            <ArrowLeft data-icon="inline-start" />{t.back}
          </Link>
          <h2 className="text-xl font-semibold tracking-tight">{t.title}</h2>
          <p className="text-xs text-muted-foreground">{proposal.generatedBy ? t.generatedBy[proposal.generatedBy] : t.editorDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          {message ? <span className={cn("text-xs", Object.keys(fieldErrors).length || message.startsWith("!") ? "text-destructive" : "text-muted-foreground")}>{message}</span> : null}
          <Button type="button" size="sm" onClick={() => save()} disabled={pending}>
            {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
            {pending ? t.saving : t.save}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DetailSection title={t.fields.details}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title" className="mb-1.5 block text-xs text-muted-foreground">{t.fields.title}</Label>
                <Input id="title" value={title} onChange={(e) => touch(setTitle)(e.target.value)} aria-invalid={Boolean(fieldErrors.title)} />
                {fieldErrors.title ? <p className="mt-1 text-xs text-destructive">{fieldErrors.title}</p> : null}
              </div>
              <div>
                <Label htmlFor="clientName" className="mb-1.5 block text-xs text-muted-foreground">{t.fields.client}</Label>
                <Input id="clientName" value={clientName} onChange={(e) => touch(setClientName)(e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label htmlFor="currency" className="mb-1.5 block text-xs text-muted-foreground">{dict.pricing.project.currency}</Label>
                  <select id="currency" value={currency} onChange={(e) => touch(setCurrency)(e.target.value as Proposal["currency"])} className={cn(selectCls, "w-full")}>
                    {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="vatRate" className="mb-1.5 block text-xs text-muted-foreground">{t.fields.vatRate}</Label>
                  <Input id="vatRate" type="number" min={0} max={100} step="any" value={vatRate} onChange={(e) => touch(setVatRate)(e.target.value)} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.vatRate)} />
                </div>
                <div>
                  <Label htmlFor="validUntil" className="mb-1.5 block text-xs text-muted-foreground">{t.fields.validUntil}</Label>
                  <Input id="validUntil" type="date" value={validUntil} onChange={(e) => touch(setValidUntil)(e.target.value)} aria-invalid={Boolean(fieldErrors.validUntil)} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="intro" className="mb-1.5 block text-xs text-muted-foreground">{t.fields.intro}</Label>
                <Textarea id="intro" rows={3} value={intro} onChange={(e) => touch(setIntro)(e.target.value)} placeholder={t.fields.introPlaceholder} />
              </div>
            </div>
          </DetailSection>

          <DetailSection title={t.fields.items} action={<Button type="button" size="sm" variant="outline" onClick={() => { setItems((prev) => [...prev, { id: newItemId(), title: "", description: "", kind: "fixed", hours: 0, rate: 0, amount: 0, quantity: 0, unitPrice: 0, unitLabel: null }]); setDirty(true); }}><Plus data-icon="inline-start" />{t.fields.addItem}</Button>}>
            {items.length === 0 ? <p className="text-sm text-muted-foreground">{t.fields.noItems}</p> : (
              <ol className="space-y-3">
                {items.map((it, index) => (
                  <li key={it.id} className="rounded-md border p-3" data-item-kind={it.kind}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]">
                      <div>
                        <Input value={it.title} onChange={(e) => patchItem(it.id, { title: e.target.value })} placeholder={t.fields.itemTitle} aria-label={`${t.fields.item} ${index + 1}`} aria-invalid={Boolean(fieldErrors[`items.${index}.title`])} className="font-medium" />
                        <Textarea rows={2} value={it.description} onChange={(e) => patchItem(it.id, { description: e.target.value })} placeholder={t.fields.description} className="mt-2" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <select value={it.kind} onChange={(e) => patchItem(it.id, { kind: e.target.value as ProposalItem["kind"] })} className={selectCls} aria-label={t.fields.kind}>
                          <option value="fixed">{t.kinds.fixed}</option>
                          <option value="hourly">{t.kinds.hourly}</option>
                          <option value="unit">{t.kinds.unit}</option>
                        </select>
                        {it.kind === "unit" ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" min={0} step="any" value={it.quantity || ""} onChange={(e) => patchItem(it.id, { quantity: Number(e.target.value) || 0 })} placeholder={t.fields.quantity} aria-label={t.fields.quantity} className="w-20 text-right tabular-nums" />
                            <Input value={it.unitLabel ?? ""} onChange={(e) => patchItem(it.id, { unitLabel: e.target.value || null })} placeholder={t.fields.unitLabel} aria-label={t.fields.unitLabel} className="w-14 text-xs" maxLength={30} />
                            <span className="text-xs text-muted-foreground">×</span>
                            <Input type="number" min={0} step="any" value={it.unitPrice || ""} onChange={(e) => patchItem(it.id, { unitPrice: Number(e.target.value) || 0 })} placeholder={t.fields.unitPrice} aria-label={t.fields.unitPrice} className="w-24 text-right tabular-nums" />
                          </div>
                        ) : it.kind === "hourly" ? (
                          <div className="flex items-center gap-1">
                            <Input type="number" min={0} step="any" value={it.hours || ""} onChange={(e) => patchItem(it.id, { hours: Number(e.target.value) || 0 })} placeholder={t.fields.hours} aria-label={t.fields.hours} className="w-20 text-right tabular-nums" />
                            <span className="text-xs text-muted-foreground">×</span>
                            <Input type="number" min={0} step="any" value={it.rate || ""} onChange={(e) => patchItem(it.id, { rate: Number(e.target.value) || 0 })} placeholder={t.fields.rate} aria-label={t.fields.rate} className="w-24 text-right tabular-nums" />
                          </div>
                        ) : (
                          <Input type="number" min={0} step="any" value={it.amount || ""} onChange={(e) => patchItem(it.id, { amount: Number(e.target.value) || 0 })} placeholder={t.fields.amount} aria-label={t.fields.amount} className="w-full text-right tabular-nums sm:w-36" />
                        )}
                      </div>
                      <div className="flex flex-row items-start justify-between gap-2 sm:flex-col sm:items-end">
                        <span className="text-sm font-semibold tabular-nums">{money(itemAmount(it))}</span>
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => { setItems((prev) => prev.filter((x) => x.id !== it.id)); setDirty(true); }} aria-label={t.fields.remove} className="text-muted-foreground hover:text-destructive"><Trash2 /></Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <div className="mt-4 ml-auto w-full max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">{t.totals.subtotal}</span><span className="tabular-nums">{money(totals.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">{interpolate(t.totals.vat, { rate: vatRate || "0" })}</span><span className="tabular-nums">{money(totals.vat)}</span></div>
              <div className="flex justify-between border-t pt-1 font-semibold"><span>{t.totals.total}</span><span className="tabular-nums">{money(totals.total)}</span></div>
            </div>
          </DetailSection>

          <DetailSection title={t.fields.notes}>
            <Textarea rows={3} value={notes} onChange={(e) => touch(setNotes)(e.target.value)} placeholder={t.fields.notesPlaceholder} />
          </DetailSection>
        </div>

        <div className="space-y-6">
          <DetailSection title={t.share.title}>
            <div className="space-y-3" data-guide="pricing-share">
              <p className="text-xs text-muted-foreground">{t.share.description}</p>
              <p className={cn("text-xs", shared ? "text-emerald-400" : "text-amber-400")}>{shared ? interpolate(t.share.shared, { date: sharedOn }) : t.share.draft}</p>
              {!shareAvailable ? <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-300">{t.share.unavailable}</p> : null}
              <div className="flex items-center gap-2">
                <Input readOnly value={shareUrl} className="h-8 text-xs" aria-label={t.share.link} onFocus={(e) => e.currentTarget.select()} />
                <Button type="button" size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                  {copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? t.share.copied : t.share.copy}
                </Button>
              </div>
              <Button type="button" size="sm" onClick={share} disabled={sharing || pending} className="w-full">
                {sharing ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
                {shared ? t.share.reshare : t.share.markShared}
              </Button>
              <div className="grid grid-cols-2 gap-2">
                <a href={`https://wa.me/?text=${encodeURIComponent(waText)}`} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "sm", variant: "outline" }), !shared && "pointer-events-none opacity-50")} aria-disabled={!shared}>
                  <MessageCircle data-icon="inline-start" />{t.share.whatsapp}
                </a>
                <a href={`mailto:?subject=${encodeURIComponent(interpolate(t.share.subject, { title }))}&body=${encodeURIComponent(waText)}`} className={cn(buttonVariants({ size: "sm", variant: "outline" }), !shared && "pointer-events-none opacity-50")} aria-disabled={!shared}>
                  <Mail data-icon="inline-start" />{t.share.email}
                </a>
              </div>
              <a href={shareUrl} target="_blank" rel="noreferrer" className={cn(buttonVariants({ size: "xs", variant: "ghost" }), "w-full", !shared && "pointer-events-none opacity-50")} aria-disabled={!shared}>
                <ExternalLink data-icon="inline-start" />{t.share.openPublic}
              </a>
            </div>
          </DetailSection>
        </div>
      </div>
    </div>
  );
}
