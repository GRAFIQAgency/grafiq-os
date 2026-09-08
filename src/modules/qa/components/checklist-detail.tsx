"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronDown, ChevronRight, ExternalLink, Loader2, ShieldCheck, ShieldOff, SkipForward, Trash2, Wrench } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { INTL_LOCALES } from "@/lib/i18n/config";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { approveChecklist, createFixTask, deleteChecklist, revokeApproval, updateChecklist, updateItem } from "../actions/checklists";
import { approvalCheck, groupByCategory, nextUnresolved, progressOf } from "../calculations/checklist";
import { ITEM_STATUSES } from "../constants";
import type { ChecklistDetail as Detail } from "../queries";
import type { QaChecklistItem, QaItemStatus } from "../types";
import { ChecklistStatusBadge, ITEM_BUTTON_ACTIVE, ItemStatusBadge, QaProgressBar } from "./qa-badges";

const selectCls = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

/** Fast review UX: items grouped by category, inline Pass / Fail / N/A / Blocked, notes and fix tasks. */
export function ChecklistDetail({ detail, reviewers }: { detail: Detail; reviewers: { id: string; label: string }[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.qa.checklist;
  const c = detail.checklist;
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [, start] = useTransition();
  const progress = useMemo(() => progressOf(c.items), [c.items]);
  const gate = useMemo(() => approvalCheck(c.items), [c.items]);
  const next = useMemo(() => nextUnresolved(c.items), [c.items]);
  const fmt = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium" });
  const fmtTime = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  const memberName = (id: string | null) => detail.members.find((m) => m.id === id)?.displayName ?? null;
  const projectHref = `${getModule("projects").href}/${detail.project.id}`;

  const run = (key: string, work: () => Promise<{ error?: string; fieldErrors?: Record<string, string> } | void>, done?: string) => {
    setBusy(key);
    start(async () => {
      try {
        const r = (await work()) ?? {};
        setFieldErrors(r.fieldErrors ?? {});
        setMessage(r.error ?? done ?? null);
        if (!r.error) router.refresh();
      } finally {
        setBusy(null);
      }
    });
  };

  function setStatus(item: QaChecklistItem, status: QaItemStatus) {
    run(item.id, () => updateItem(item.id, { status, note: item.note ?? "", evidenceUrl: item.evidenceUrl ?? "", assigneeMemberId: item.assigneeMemberId ?? "" }));
  }

  function jumpToNext() {
    if (!next) return;
    setOpen(next.id);
    document.getElementById(`qa-item-${next.id}`)?.scrollIntoView({ block: "center" });
  }

  return (
    <div className="space-y-6" data-guide="qa-checklist">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Link href={projectHref + "?tab=qa"} className={buttonVariants({ variant: "ghost", size: "xs" })}><ArrowLeft data-icon="inline-start" />{t.back}</Link>
          <h2 className="text-xl font-semibold tracking-tight">{c.title}</h2>
          <p className="text-sm text-muted-foreground">
            <Link href={projectHref} className="hover:underline">{detail.project.name}</Link> · {t.template}: {c.templateName}
          </p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <ChecklistStatusBadge status={c.status} dict={dict} className="h-6 px-2.5 text-sm" />
            <span>{t.reviewer}: {c.reviewerName ?? t.noReviewer}</span>
            {c.dueDate ? <span className={cn(c.status !== "approved" && c.dueDate < new Date().toISOString().slice(0, 10) && "font-medium text-red-400")}>{t.dueDate}: {fmt.format(new Date(c.dueDate))}</span> : null}
            <span>{c.requiredForCompletion ? t.required : t.optional}</span>
            {c.deliveryQuantity != null ? <span>{interpolate(t.sampling.summary, { sample: c.sampleQuantity ?? 0, delivery: c.deliveryQuantity })}</span> : null}
          </div>
          {c.status === "approved" && c.approvedAt ? <p className="text-xs text-emerald-400">{interpolate(t.approvedBy, { name: c.approvedByName ?? "—", date: fmtTime.format(new Date(c.approvedAt)) })}</p> : null}
        </div>
        <div className="flex flex-col items-end gap-2" data-guide="qa-approve">
          <div className="flex flex-wrap items-center gap-2">
            {message ? <span className={cn("text-xs", Object.keys(fieldErrors).length ? "text-destructive" : "text-muted-foreground")}>{message}</span> : null}
            {next ? <Button type="button" size="sm" variant="outline" onClick={jumpToNext}><SkipForward data-icon="inline-start" />{t.nextUnresolved}</Button> : null}
            {c.status === "approved" ? (
              <Button type="button" size="sm" variant="outline" disabled={busy === "approve"} onClick={() => { if (window.confirm(t.revokeConfirm)) run("approve", () => revokeApproval(c.id), t.revoked); }}><ShieldOff data-icon="inline-start" />{t.revoke}</Button>
            ) : (
              <Button type="button" size="sm" disabled={!gate.eligible || busy === "approve"} title={gate.eligible ? undefined : t.notEligible} onClick={() => run("approve", () => approveChecklist(c.id), t.approved)}>
                {busy === "approve" ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}{t.approve}
              </Button>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground">{gate.eligible ? t.approveHint : gate.reasons.map((r) => t.reasons[r]).join(" · ")}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: t.progress, value: `${progress.resolved}/${progress.total}` },
          { label: dict.qa.itemStatuses.pass, value: String(progress.passed) },
          { label: dict.qa.itemStatuses.fail, value: String(progress.failed), warn: progress.failed > 0 },
          { label: dict.qa.itemStatuses.blocked, value: String(progress.blocked), warn: progress.blocked > 0 },
        ].map((i) => (
          <div key={i.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{i.label}</p>
            <p className={cn("mt-1 text-lg font-semibold tabular-nums", i.warn && "text-red-400")}>{i.value}</p>
          </div>
        ))}
      </div>
      <QaProgressBar percent={progress.percent} failedShare={progress.total ? ((progress.failed + progress.blocked) / progress.total) * 100 : 0} className="h-2" />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-4 xl:col-span-2">
          {groupByCategory(c.items).map((group) => {
            const gp = progressOf(group.items);
            return (
              <DetailSection key={group.category} title={group.category} action={<span className={cn("text-xs tabular-nums", gp.failed + gp.blocked ? "text-red-400" : "text-muted-foreground")}>{interpolate(t.categoryProgress, { passed: gp.passed + gp.na, total: gp.total })}</span>}>
                <ul className="divide-y divide-border/60">
                  {group.items.map((item) => {
                    const expanded = open === item.id;
                    const task = item.fixTaskId ? detail.fixTasks[item.fixTaskId] : null;
                    return (
                      <li key={item.id} id={`qa-item-${item.id}`} className={cn("py-2.5", busy === item.id && "opacity-60")}>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => setOpen(expanded ? null : item.id)} aria-expanded={expanded}>
                            {expanded ? <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                            <span className="min-w-0">
                              <span className={cn("block text-sm", item.status === "na" && "text-muted-foreground line-through")}>{item.title}{item.isRequired ? <span className="ml-1 text-red-400" title={t.item.required}>*</span> : null}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {[memberName(item.assigneeMemberId), item.note ? "✎" : null, item.evidenceUrl ? "🔗" : null, task ? `${t.item.fixTask}: ${dict.projects.work.taskStatuses[task.status as keyof typeof dict.projects.work.taskStatuses] ?? task.status}` : null].filter(Boolean).join(" · ")}
                              </span>
                            </span>
                          </button>
                          <div className="flex shrink-0 items-center gap-1" data-guide="qa-item-controls">
                            {ITEM_STATUSES.filter((s) => s !== "pending").map((s) => (
                              <button
                                key={s}
                                type="button"
                                disabled={busy === item.id || (s === "na" && !item.allowNa)}
                                title={s === "na" && !item.allowNa ? dict.qa.validation.naNotAllowed : dict.qa.itemStatuses[s]}
                                onClick={() => setStatus(item, item.status === s ? "pending" : s)}
                                className={cn("h-7 rounded-md border px-2 text-xs font-medium transition-colors disabled:opacity-40", item.status === s ? ITEM_BUTTON_ACTIVE[s] : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground")}
                              >
                                {dict.qa.itemStatuses[s]}
                              </button>
                            ))}
                          </div>
                        </div>
                        {expanded ? (
                          <ItemDetails item={item} detail={detail} busy={busy === item.id} fieldErrors={fieldErrors} onSave={(data) => run(item.id, () => updateItem(item.id, { ...data, status: item.status }), t.item.saved)} onFixTask={(data) => run(item.id, () => createFixTask(item.id, data), t.item.fixTaskCreated)} />
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </DetailSection>
            );
          })}
          {c.items.length === 0 ? <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">{t.noItems}</p> : null}
        </div>

        <div className="space-y-6">
          <DetailSection title={t.settings} action={<Button type="button" size="xs" variant="ghost" onClick={() => setSettingsOpen((v) => !v)}>{settingsOpen ? dict.sales.detail.cancel : t.edit}</Button>}>
            {settingsOpen ? (
              <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries()); run("settings", async () => { const r = await updateChecklist(c.id, data); if (!r.error) setSettingsOpen(false); return r; }, t.saved); }}>
                <div><Label htmlFor="title" className="mb-1 block text-xs text-muted-foreground">{t.titleField}</Label><Input id="title" name="title" defaultValue={c.title} required aria-invalid={Boolean(fieldErrors.title)} /></div>
                <div>
                  <Label htmlFor="reviewerId" className="mb-1 block text-xs text-muted-foreground">{t.reviewer}</Label>
                  <select id="reviewerId" name="reviewerId" defaultValue={c.reviewerId ?? ""} className={selectCls}><option value="">{t.noReviewer}</option>{reviewers.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
                </div>
                <div><Label htmlFor="dueDate" className="mb-1 block text-xs text-muted-foreground">{t.dueDate}</Label><Input id="dueDate" name="dueDate" type="date" defaultValue={c.dueDate ?? ""} aria-invalid={Boolean(fieldErrors.dueDate)} /></div>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiredForCompletion" defaultChecked={c.requiredForCompletion} className="size-4" />{t.requiredForCompletion}</label>
                <p className="text-[11px] text-muted-foreground">{t.requiredHint}</p>
                <div className="rounded-md border p-3" data-guide="qa-sampling">
                  <p className="mb-2 text-xs font-medium">{t.sampling.title}</p>
                  <p className="mb-2 text-[11px] text-muted-foreground">{t.sampling.hint}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label htmlFor="deliveryQuantity" className="mb-1 block text-xs text-muted-foreground">{t.sampling.delivery}</Label><Input id="deliveryQuantity" name="deliveryQuantity" type="number" min={0} step="any" defaultValue={c.deliveryQuantity ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.deliveryQuantity)} /></div>
                    <div><Label htmlFor="sampleQuantity" className="mb-1 block text-xs text-muted-foreground">{t.sampling.sample}</Label><Input id="sampleQuantity" name="sampleQuantity" type="number" min={0} step="any" defaultValue={c.sampleQuantity ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.sampleQuantity)} /></div>
                  </div>
                  {fieldErrors.sampleQuantity ? <p className="mt-1 text-xs text-destructive">{fieldErrors.sampleQuantity}</p> : null}
                  <Textarea name="samplingNote" rows={2} defaultValue={c.samplingNote ?? ""} placeholder={t.sampling.notePlaceholder} className="mt-2" />
                </div>
                <Button type="submit" size="sm" disabled={busy === "settings"}>{t.save}</Button>
              </form>
            ) : (
              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.reviewer}</dt><dd>{c.reviewerName ?? t.noReviewer}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.dueDate}</dt><dd>{c.dueDate ? fmt.format(new Date(c.dueDate)) : "—"}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.requiredForCompletion}</dt><dd>{c.requiredForCompletion ? dict.sourcing.search.yes : t.optional}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.sampling.title}</dt><dd className="text-right">{c.deliveryQuantity != null ? interpolate(t.sampling.summary, { sample: c.sampleQuantity ?? 0, delivery: c.deliveryQuantity }) : "—"}{c.samplingNote ? <span className="block text-xs text-muted-foreground">{c.samplingNote}</span> : null}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-muted-foreground">{t.project}</dt><dd>{dict.projects.statuses[detail.project.status]}{detail.project.deadline ? ` · ${fmt.format(new Date(detail.project.deadline))}` : ""}</dd></div>
              </dl>
            )}
          </DetailSection>

          <DetailSection title={t.dangerTitle}>
            <p className="mb-3 text-xs text-muted-foreground">{t.deleteHint}</p>
            <Button type="button" size="sm" variant="outline" className="w-full text-destructive hover:text-destructive" disabled={busy === "delete"} onClick={() => { if (window.confirm(t.deleteConfirm)) run("delete", async () => { const r = await deleteChecklist(c.id); if (!r.error) router.push(projectHref + "?tab=qa"); return r; }); }}>
              <Trash2 data-icon="inline-start" />{t.delete}
            </Button>
          </DetailSection>
        </div>
      </div>
    </div>
  );
}

function ItemDetails({ item, detail, busy, fieldErrors, onSave, onFixTask }: { item: QaChecklistItem; detail: Detail; busy: boolean; fieldErrors: Record<string, string>; onSave: (data: Record<string, FormDataEntryValue>) => void; onFixTask: (data: { assigneeMemberId: string; milestoneId: string }) => void }) {
  const { dict, locale } = useI18n();
  const t = dict.qa.checklist.item;
  const task = item.fixTaskId ? detail.fixTasks[item.fixTaskId] : null;
  const fmtTime = new Intl.DateTimeFormat(INTL_LOCALES[locale], { dateStyle: "medium", timeStyle: "short" });
  const checkedBy = item.checkedBy ? detail.members.find((m) => m.userId === item.checkedBy)?.displayName ?? null : null;
  const projectHref = `${getModule("projects").href}/${detail.project.id}`;
  return (
    <div className="mt-2 ml-6 space-y-3 rounded-md border bg-muted/20 p-3">
      {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
      <form className="grid grid-cols-1 gap-2 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSave(Object.fromEntries(new FormData(e.currentTarget).entries())); }}>
        <div className="sm:col-span-2">
          <Label className="mb-1 block text-xs text-muted-foreground">{t.note}</Label>
          <Textarea name="note" rows={2} defaultValue={item.note ?? ""} placeholder={t.notePlaceholder} />
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t.evidence}</Label>
          <Input name="evidenceUrl" defaultValue={item.evidenceUrl ?? ""} placeholder={t.evidencePlaceholder} aria-invalid={Boolean(fieldErrors.evidenceUrl)} />
          {fieldErrors.evidenceUrl ? <p className="mt-1 text-xs text-destructive">{fieldErrors.evidenceUrl}</p> : null}
        </div>
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{t.assignee}</Label>
          <select name="assigneeMemberId" defaultValue={item.assigneeMemberId ?? ""} className={selectCls}><option value="">{t.unassigned}</option>{detail.members.map((m) => <option key={m.id} value={m.id}>{m.displayName} · {m.projectRole}</option>)}</select>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
          <Button type="submit" size="xs" disabled={busy}><Check data-icon="inline-start" />{t.save}</Button>
          {item.evidenceUrl ? <a href={item.evidenceUrl} target="_blank" rel="noreferrer" className={buttonVariants({ size: "xs", variant: "ghost" })}><ExternalLink data-icon="inline-start" />{t.openEvidence}</a> : null}
          {item.checkedAt ? <span className="text-[11px] text-muted-foreground">{interpolate(t.checkedBy, { name: checkedBy ?? "—", date: fmtTime.format(new Date(item.checkedAt)) })}</span> : null}
          <ItemStatusBadge status={item.status} dict={dict} className="ml-auto" />
        </div>
      </form>
      {item.status === "fail" || item.status === "blocked" || task ? (
        <div className="flex flex-wrap items-center gap-2 border-t pt-3" data-guide="qa-fix-task">
          {task ? (
            <>
              <Wrench className="size-3.5 text-muted-foreground" />
              <span className="text-xs">{t.fixTask}: <span className="font-medium">{task.title}</span> · {dict.projects.work.taskStatuses[task.status as keyof typeof dict.projects.work.taskStatuses] ?? task.status}</span>
              <Link href={`${projectHref}?tab=work`} className={buttonVariants({ size: "xs", variant: "ghost" })}>{t.fixTaskOpen}</Link>
              {task.status === "done" ? <span className="text-[11px] text-amber-400">{t.fixTaskDone}</span> : null}
            </>
          ) : (
            <FixTaskForm members={detail.members} milestones={detail.milestones} defaultAssignee={item.assigneeMemberId} busy={busy} onSubmit={onFixTask} />
          )}
        </div>
      ) : null}
    </div>
  );
}

function FixTaskForm({ members, milestones, defaultAssignee, busy, onSubmit }: { members: Detail["members"]; milestones: Detail["milestones"]; defaultAssignee: string | null; busy: boolean; onSubmit: (data: { assigneeMemberId: string; milestoneId: string }) => void }) {
  const { dict } = useI18n();
  const t = dict.qa.checklist.item;
  return (
    <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); onSubmit({ assigneeMemberId: String(d.get("assigneeMemberId") ?? ""), milestoneId: String(d.get("milestoneId") ?? "") }); }}>
      <div>
        <Label className="mb-1 block text-xs text-muted-foreground">{t.assignee}</Label>
        <select name="assigneeMemberId" defaultValue={defaultAssignee ?? ""} className={cn(selectCls, "w-44")}><option value="">{t.unassigned}</option>{members.map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}</select>
      </div>
      {milestones.length ? (
        <div>
          <Label className="mb-1 block text-xs text-muted-foreground">{dict.projects.work.milestone}</Label>
          <select name="milestoneId" defaultValue="" className={cn(selectCls, "w-44")}><option value="">—</option>{milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}</select>
        </div>
      ) : null}
      <Button type="submit" size="xs" variant="outline" disabled={busy}><Wrench data-icon="inline-start" />{t.createFixTask}</Button>
      <span className="text-[11px] text-muted-foreground">{t.fixTaskHint}</span>
    </form>
  );
}
