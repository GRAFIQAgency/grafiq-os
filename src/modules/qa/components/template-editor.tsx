"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowDown, ArrowLeft, ArrowUp, Copy, Loader2, Plus, Save, Trash2, X } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import { PROJECT_TYPES } from "@/modules/projects/constants";
import { cn } from "@/lib/utils";

import { addTemplateItem, deleteTemplate, deleteTemplateItem, duplicateTemplate, moveTemplateItem, setTemplateActive, updateTemplate, updateTemplateItem } from "../actions/templates";
import { groupByCategory } from "../calculations/checklist";
import type { QaTemplate, QaTemplateItem } from "../types";

const selectCls = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30";

/** Template editor: metadata on top, items grouped by category with inline editing. */
export function TemplateEditor({ template, usedByChecklists }: { template: QaTemplate; usedByChecklists: number }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.qa.templates.editor;
  const types = dict.projects.types as Record<string, string>;
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const base = getModule("qa").href;

  const run = (work: () => Promise<{ error?: string; fieldErrors?: Record<string, string> } | void>, done?: string) =>
    start(async () => {
      const r = (await work()) ?? {};
      setFieldErrors(r.fieldErrors ?? {});
      setMessage(r.error ?? done ?? null);
      if (!r.error) router.refresh();
    });

  const categories = [...new Set(template.items.map((i) => i.category))];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <Link href={`${base}?tab=templates`} className={buttonVariants({ variant: "ghost", size: "xs" })}><ArrowLeft data-icon="inline-start" />{t.back}</Link>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold tracking-tight">{template.name}</h2>
            <StatusBadge status={template.isActive ? "approved" : "archived"} label={template.isActive ? dict.qa.templates.active : dict.qa.templates.archived} />
          </div>
          <p className="text-xs text-muted-foreground">{interpolate(t.usedByChecklists, { n: usedByChecklists })} · {t.frozenHint}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {message ? <span className={cn("text-xs", Object.keys(fieldErrors).length ? "text-destructive" : "text-muted-foreground")}>{message}</span> : null}
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(async () => { const r = await duplicateTemplate(template.id); if (r.id) router.push(`${base}/templates/${r.id}`); return r; })}><Copy data-icon="inline-start" />{t.duplicate}</Button>
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => setTemplateActive(template.id, !template.isActive), template.isActive ? t.archived : t.restored)}>
            {template.isActive ? <Archive data-icon="inline-start" /> : <ArchiveRestore data-icon="inline-start" />}{template.isActive ? t.archive : t.restore}
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={pending || usedByChecklists > 0} title={usedByChecklists > 0 ? t.deleteBlocked : undefined} className="text-destructive hover:text-destructive" onClick={() => { if (window.confirm(t.deleteConfirm)) run(async () => { const r = await deleteTemplate(template.id); if (!r.error) router.push(`${base}?tab=templates`); return r; }); }}>
            <Trash2 data-icon="inline-start" />{t.delete}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2" data-guide="qa-template-editor">
          {groupByCategory(template.items).map((group) => (
            <DetailSection key={group.category} title={group.category} action={<span className="text-xs text-muted-foreground tabular-nums">{group.items.length}</span>}>
              <ul className="divide-y divide-border/60">
                {group.items.map((item) => (
                  <li key={item.id} className="py-2">
                    {editing === item.id ? (
                      <ItemForm item={item} categories={categories} onCancel={() => setEditing(null)} onSubmit={(data) => run(async () => { const r = await updateTemplateItem(item.id, data); if (!r.error) setEditing(null); return r; }, t.saved)} pending={pending} fieldErrors={fieldErrors} />
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setEditing(item.id)}>
                          <p className="text-sm font-medium hover:underline">{item.title}</p>
                          {item.description ? <p className="text-xs text-muted-foreground">{item.description}</p> : null}
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{item.isRequired ? t.required : t.optional}{item.allowNa ? ` · ${t.allowNa}` : ""}</p>
                        </button>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button type="button" size="icon-sm" variant="ghost" disabled={pending} aria-label={t.moveUp} onClick={() => run(() => moveTemplateItem(item.id, "up"))}><ArrowUp /></Button>
                          <Button type="button" size="icon-sm" variant="ghost" disabled={pending} aria-label={t.moveDown} onClick={() => run(() => moveTemplateItem(item.id, "down"))}><ArrowDown /></Button>
                          <Button type="button" size="icon-sm" variant="ghost" disabled={pending} aria-label={t.removeItem} className="text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm(t.removeConfirm)) run(() => deleteTemplateItem(item.id)); }}><X /></Button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ))}
          {template.items.length === 0 && !adding ? <p className="rounded-lg border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">{t.noItems}</p> : null}
          {adding ? (
            <DetailSection title={t.addItem}>
              <ItemForm item={null} categories={categories} onCancel={() => setAdding(false)} onSubmit={(data) => run(async () => { const r = await addTemplateItem(template.id, data); if (!r.error) setAdding(false); return r; }, t.saved)} pending={pending} fieldErrors={fieldErrors} />
            </DetailSection>
          ) : (
            <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)} data-guide="qa-template-add-item"><Plus data-icon="inline-start" />{t.addItem}</Button>
          )}
        </div>

        <DetailSection title={t.metadata}>
          <form
            className="space-y-4"
            onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries()); run(() => updateTemplate(template.id, { ...data, isActive: template.isActive }), t.saved); }}
          >
            <div>
              <Label htmlFor="name" className="mb-1.5 block text-xs text-muted-foreground">{t.name}</Label>
              <Input id="name" name="name" defaultValue={template.name} aria-invalid={Boolean(fieldErrors.name)} required />
              {fieldErrors.name ? <p className="mt-1 text-xs text-destructive">{fieldErrors.name}</p> : null}
            </div>
            <div>
              <Label htmlFor="projectType" className="mb-1.5 block text-xs text-muted-foreground">{t.projectType}</Label>
              <select id="projectType" name="projectType" defaultValue={template.projectType ?? ""} className={selectCls}>
                <option value="">{t.noType}</option>
                {PROJECT_TYPES.map((p) => <option key={p} value={p}>{types[p] ?? p}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="description" className="mb-1.5 block text-xs text-muted-foreground">{t.descriptionField}</Label>
              <Textarea id="description" name="description" rows={4} defaultValue={template.description ?? ""} />
            </div>
            <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}{t.save}</Button>
          </form>
        </DetailSection>
      </div>
    </div>
  );
}

function ItemForm({ item, categories, onCancel, onSubmit, pending, fieldErrors }: { item: QaTemplateItem | null; categories: string[]; onCancel: () => void; onSubmit: (data: Record<string, FormDataEntryValue>) => void; pending: boolean; fieldErrors: Record<string, string> }) {
  const { dict } = useI18n();
  const t = dict.qa.templates.editor;
  return (
    <form className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); onSubmit(Object.fromEntries(new FormData(e.currentTarget).entries())); }}>
      <div>
        <Label className="mb-1 block text-xs text-muted-foreground">{t.category}</Label>
        <Input name="category" defaultValue={item?.category ?? categories[categories.length - 1] ?? ""} list="qa-categories" aria-invalid={Boolean(fieldErrors.category)} required />
        <datalist id="qa-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </div>
      <div>
        <Label className="mb-1 block text-xs text-muted-foreground">{t.itemTitle}</Label>
        <Input name="title" defaultValue={item?.title ?? ""} aria-invalid={Boolean(fieldErrors.title)} required autoFocus />
      </div>
      <div className="sm:col-span-2">
        <Label className="mb-1 block text-xs text-muted-foreground">{t.itemDescription}</Label>
        <Input name="description" defaultValue={item?.description ?? ""} />
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm sm:col-span-2">
        <label className="flex items-center gap-2"><input type="checkbox" name="isRequired" defaultChecked={item?.isRequired ?? true} className="size-4" />{t.required}</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="allowNa" defaultChecked={item?.allowNa ?? false} className="size-4" />{t.allowNa}</label>
        <div className="ml-auto flex gap-2">
          <Button type="button" size="sm" variant="ghost" onClick={onCancel}>{dict.sales.detail.cancel}</Button>
          <Button type="submit" size="sm" disabled={pending}>{t.save}</Button>
        </div>
      </div>
    </form>
  );
}
