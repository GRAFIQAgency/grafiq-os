"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/lib/i18n/client";

import { deleteLink, saveLink } from "../actions/financials";
import { setManualProgress, updateProject } from "../actions/projects";
import { LINK_KINDS, PRIORITIES, PROJECT_TYPES } from "../constants";
import type { Project, ProjectLink } from "../types";
import { Field, NativeSelect } from "./form-primitives";

export function LinksEditor({ projectId, links }: { projectId: string; links: ProjectLink[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.projects.overview;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-2">
      {links.length ? (
        <div className="flex flex-wrap gap-1">
          {links.map((l) => (
            <button key={l.id} type="button" onClick={() => start(async () => { await deleteLink(l.id); router.refresh(); })} className="inline-flex items-center gap-1 rounded bg-muted/60 px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground" aria-label={`${dict.projects.work.delete} ${l.label}`}>
              {l.label} <X className="size-3" />
            </button>
          ))}
        </div>
      ) : null}
      {open ? (
        <form className="grid grid-cols-1 gap-2 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; start(async () => { const r = await saveLink(projectId, Object.fromEntries(new FormData(f).entries())); setError(r.error ?? null); if (!r.error) { f.reset(); setOpen(false); router.refresh(); } }); }}>
          <Input name="label" placeholder={t.linkLabel} required />
          <Input name="url" placeholder="https://…" required />
          <div className="flex gap-2">
            <NativeSelect name="kind" defaultValue="other" options={LINK_KINDS.map((k) => ({ value: k, label: dict.projects.linkKinds[k] }))} />
            <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" /> : t.save}</Button>
          </div>
          {error ? <p className="text-xs text-destructive sm:col-span-3">{error}</p> : null}
        </form>
      ) : (
        <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)} data-guide="projects-links"><Plus data-icon="inline-start" />{t.addLink}</Button>
      )}
    </div>
  );
}

export function ManualProgress({ id, value }: { id: string; value: number | null }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  return (
    <form className="mt-3 flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); const v = (new FormData(e.currentTarget).get("percent") as string) ?? ""; start(async () => { await setManualProgress(id, v === "" ? null : Number(v)); router.refresh(); }); }}>
      <Input name="percent" type="number" min={0} max={100} defaultValue={value ?? ""} className="w-24 text-right tabular-nums" aria-label={dict.projects.progress.setManual} />
      <Button type="submit" size="sm" variant="outline" disabled={pending}>{dict.projects.progress.setManual}</Button>
      <span className="text-xs text-muted-foreground">{dict.projects.progress.manualHint}</span>
    </form>
  );
}

export function ProjectEditForm({ project, owners, clients }: { project: Project; owners: { id: string; label: string }[]; clients: { id: string; label: string }[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.projects.create;
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  if (!open) return <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} data-guide="projects-edit">{dict.projects.overview.edit}</Button>;
  return (
    <DetailSection title={dict.projects.overview.edit}>
      <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await updateProject(project.id, { ...data, baselineRevenue: project.baselineRevenue, baselineDirectCost: project.baselineDirectCost, baselineTargetMargin: project.baselineTargetMargin, currency: project.currency, status: project.status }); setFieldErrors(r.fieldErrors ?? {}); setMessage(r.error ?? dict.projects.overview.saved); if (!r.error) { setOpen(false); router.refresh(); } }); }}>
        <Field name="name" label={t.name} error={fieldErrors.name}><Input id="name" name="name" defaultValue={project.name} required /></Field>
        <Field name="clientId" label={t.client}><NativeSelect name="clientId" defaultValue={project.clientId ?? ""} placeholder={t.noClient} options={clients.map((c) => ({ value: c.id, label: c.label }))} /></Field>
        <Field name="projectType" label={t.type}><NativeSelect name="projectType" defaultValue={project.projectType} options={[...PROJECT_TYPES.map((v) => ({ value: v, label: dict.projects.types[v] })), ...(PROJECT_TYPES.includes(project.projectType as never) ? [] : [{ value: project.projectType, label: project.projectType }])]} /></Field>
        <Field name="ownerId" label={t.owner}><NativeSelect name="ownerId" defaultValue={project.ownerId ?? ""} placeholder={t.noOwner} options={owners.map((o) => ({ value: o.id, label: o.label }))} /></Field>
        <Field name="priority" label={t.priority}><NativeSelect name="priority" defaultValue={project.priority} options={PRIORITIES.map((v) => ({ value: v, label: dict.projects.priorities[v] }))} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field name="startDate" label={t.startDate} error={fieldErrors.startDate}><Input id="startDate" name="startDate" type="date" defaultValue={project.startDate ?? ""} /></Field>
          <Field name="deadline" label={t.deadline} error={fieldErrors.deadline}><Input id="deadline" name="deadline" type="date" defaultValue={project.deadline ?? ""} /></Field>
        </div>
        <Field name="contactName" label={t.contactName}><Input id="contactName" name="contactName" defaultValue={project.contactName ?? ""} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field name="contactEmail" label={t.contactEmail}><Input id="contactEmail" name="contactEmail" defaultValue={project.contactEmail ?? ""} /></Field>
          <Field name="contactPhone" label={t.contactPhone}><Input id="contactPhone" name="contactPhone" defaultValue={project.contactPhone ?? ""} /></Field>
        </div>
        <Field name="notes" label={t.notes} className="sm:col-span-2"><Textarea id="notes" name="notes" rows={3} defaultValue={project.notes ?? ""} /></Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{dict.projects.overview.save}</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.projects.work.cancel}</Button>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>
      </form>
    </DetailSection>
  );
}
