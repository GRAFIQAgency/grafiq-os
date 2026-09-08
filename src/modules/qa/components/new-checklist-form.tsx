"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { cn } from "@/lib/utils";

import { createChecklist } from "../actions/checklists";

const selectCls = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

/** "Start QA": pick a template (the recommended one is preselected), reviewer, due date; creates the frozen checklist. */
export function NewChecklistForm({ projectId, projectType, templates, recommendedId, reviewers, defaultDueDate, compact = false }: {
  projectId: string; projectType: string; templates: { id: string; name: string; itemCount: number; projectType: string | null }[]; recommendedId: string | null; reviewers: { id: string; label: string }[]; defaultDueDate: string | null; compact?: boolean;
}) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.qa.project;
  const types = dict.projects.types as Record<string, string>;
  const [open, setOpen] = useState(!compact);
  const [templateId, setTemplateId] = useState(recommendedId ?? templates[0]?.id ?? "");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const recommended = templates.find((x) => x.id === recommendedId);

  if (!open) return <Button size="sm" onClick={() => setOpen(true)} data-guide="qa-start"><ShieldCheck data-icon="inline-start" />{t.startQa}</Button>;

  return (
    <form
      className="grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-4"
      data-guide="qa-start"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        start(async () => {
          const r = await createChecklist(projectId, templateId, data);
          setFieldErrors(r.fieldErrors ?? {});
          setMessage(r.error ?? null);
          if (r.id) router.push(`${getModule("qa").href}/checklists/${r.id}`);
        });
      }}
    >
      <div className="sm:col-span-2">
        <Label htmlFor="templateId" className="mb-1 block text-xs text-muted-foreground">{t.template}</Label>
        <select id="templateId" value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={selectCls} data-guide="qa-template-pick">
          {templates.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.itemCount}{x.id === recommendedId ? ` · ${t.recommendedShort}` : ""}</option>)}
        </select>
        <p className={cn("mt-1 text-[11px]", recommended ? "text-emerald-400" : "text-muted-foreground")}>{recommended ? interpolate(t.recommended, { type: types[projectType] ?? projectType, template: recommended.name }) : t.noRecommendation}</p>
      </div>
      <div>
        <Label htmlFor="title" className="mb-1 block text-xs text-muted-foreground">{t.titleField}</Label>
        <Input id="title" name="title" placeholder={templates.find((x) => x.id === templateId)?.name ?? ""} aria-invalid={Boolean(fieldErrors.title)} />
      </div>
      <div>
        <Label htmlFor="reviewerId" className="mb-1 block text-xs text-muted-foreground">{dict.qa.checklist.reviewer}</Label>
        <select id="reviewerId" name="reviewerId" defaultValue="" className={selectCls}><option value="">{dict.qa.checklist.noReviewer}</option>{reviewers.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select>
      </div>
      <div>
        <Label htmlFor="dueDate" className="mb-1 block text-xs text-muted-foreground">{dict.qa.checklist.dueDate}</Label>
        <Input id="dueDate" name="dueDate" type="date" defaultValue={defaultDueDate ?? ""} aria-invalid={Boolean(fieldErrors.dueDate)} />
        <p className="mt-1 text-[11px] text-muted-foreground">{t.dueHint}</p>
      </div>
      <div className="flex items-end">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="requiredForCompletion" defaultChecked className="size-4" />{dict.qa.checklist.requiredForCompletion}</label>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2">
        <Button type="submit" size="sm" disabled={pending || !templateId}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <ShieldCheck data-icon="inline-start" />}{pending ? t.creating : t.create}</Button>
        {compact ? <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.sales.detail.cancel}</Button> : null}
        {message ? <span className="text-xs text-destructive">{message}</span> : null}
      </div>
    </form>
  );
}
