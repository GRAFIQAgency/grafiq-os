"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { DetailSection } from "@/components/shared/detail-section";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { deleteMilestone, deleteTask, saveMilestone, saveTask, setMilestoneStatus, setTaskStatus } from "../actions/work";
import { MILESTONE_STATUSES, PRIORITIES, TASK_STATUSES } from "../constants";
import type { Milestone, MilestoneStatus, ProjectMember, Task, TaskStatus } from "../types";
import { PriorityBadge } from "./badges";
import { Field, NativeSelect } from "./form-primitives";

interface WorkTabProps { projectId: string; milestones: Milestone[]; tasks: Task[]; members: ProjectMember[]; view: "list" | "board"; href: string }

export function WorkTab({ projectId, milestones, tasks, members, view, href }: WorkTabProps) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.projects.work;
  const [addMilestone, setAddMilestone] = useState(false);
  const [editTask, setEditTask] = useState<Task | null | "new">(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const active = members.filter((m) => m.status !== "removed");
  const memberName = (id: string | null) => active.find((m) => m.id === id)?.displayName ?? members.find((m) => m.id === id)?.displayName ?? t.unassigned;
  const refresh = () => router.refresh();

  return (
    <div className="space-y-6" data-guide="projects-work">
      <DetailSection title={t.milestones} action={<Button size="sm" variant="outline" onClick={() => setAddMilestone((v) => !v)}><Plus data-icon="inline-start" />{t.addMilestone}</Button>}>
        <p className="mb-3 text-xs text-muted-foreground">{t.milestonesHint}</p>
        {addMilestone ? (
          <form className="mb-4 grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-[2fr_1fr_1fr_auto]" onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; start(async () => { const r = await saveMilestone(projectId, Object.fromEntries(new FormData(f).entries())); setError(r.error ?? null); if (!r.error) { f.reset(); setAddMilestone(false); refresh(); } }); }}>
            <Input name="title" placeholder={t.milestoneTitle} required />
            <Input name="dueDate" type="date" aria-label={t.dueDate} />
            <NativeSelect name="ownerMemberId" placeholder={t.noOwner} options={active.map((m) => ({ value: m.id, label: m.displayName }))} />
            <Button type="submit" size="sm" disabled={pending}>{t.save}</Button>
          </form>
        ) : null}
        {milestones.length === 0 ? <p className="text-sm text-muted-foreground">{t.noMilestones}</p> : (
          <ol className="space-y-2">
            {milestones.map((m, i) => (
              <li key={m.id} className={cn("flex flex-wrap items-center gap-3 rounded-md border px-3 py-2", m.status === "completed" && "opacity-70")}>
                <span className="text-xs text-muted-foreground tabular-nums">{i + 1}.</span>
                <span className="min-w-0 flex-1 font-medium">{m.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(m.dueDate, locale)} · {m.ownerMemberId ? memberName(m.ownerMemberId) : t.noOwner}</span>
                <NativeSelect value={m.status} onChange={(v) => start(async () => { await setMilestoneStatus(projectId, m.id, v as MilestoneStatus); refresh(); })} className="w-36" options={MILESTONE_STATUSES.map((s) => ({ value: s, label: t.milestoneStatuses[s] }))} />
                <Button type="button" variant="ghost" size="icon-sm" aria-label={t.delete} className="text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm(t.confirmDelete)) start(async () => { await deleteMilestone(m.id); refresh(); }); }}><Trash2 /></Button>
              </li>
            ))}
          </ol>
        )}
      </DetailSection>

      <DetailSection title={t.tasks} action={
        <div className="flex items-center gap-1">
          <Link href={`${href}?tab=work`} className={buttonVariants({ size: "xs", variant: view === "list" ? "secondary" : "ghost" })}>{t.listView}</Link>
          <Link href={`${href}?tab=work&view=board`} className={buttonVariants({ size: "xs", variant: view === "board" ? "secondary" : "ghost" })}>{t.boardView}</Link>
          <Button size="sm" onClick={() => setEditTask("new")} data-guide="projects-add-task"><Plus data-icon="inline-start" />{t.addTask}</Button>
        </div>
      }>
        <p className="mb-3 text-xs text-muted-foreground">{t.tasksHint}</p>
        {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}
        {editTask ? (
          <TaskForm projectId={projectId} task={editTask === "new" ? null : editTask} milestones={milestones} members={active} onClose={() => setEditTask(null)} onSaved={() => { setEditTask(null); refresh(); }} />
        ) : null}
        {tasks.length === 0 ? <p className="text-sm text-muted-foreground">{t.noTasks}</p> : view === "board" ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {TASK_STATUSES.map((status) => (
              <div key={status} className="rounded-md border bg-muted/20 p-2">
                <p className="mb-2 px-1 text-xs font-medium text-muted-foreground">{t.taskStatuses[status]} <span className="tabular-nums">({tasks.filter((x) => x.status === status).length})</span></p>
                <div className="space-y-2">
                  {tasks.filter((x) => x.status === status).map((x) => (
                    <button key={x.id} type="button" onClick={() => setEditTask(x)} className="w-full rounded-md border bg-card p-2 text-left text-sm hover:bg-muted/40">
                      <p className="font-medium">{x.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{memberName(x.assigneeMemberId)}{x.dueDate ? ` · ${formatDate(x.dueDate, locale)}` : ""}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground"><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>{t.taskTitle}</th><th>{t.assignee}</th><th>{t.milestone}</th><th>{dict.projects.list.columns.status}</th><th>{t.priority}</th><th className="text-right!">{t.actualHours} / {t.estimatedHours}</th><th>{t.dueDate}</th><th /></tr></thead>
              <tbody>
                {tasks.map((x) => (
                  <tr key={x.id} className={cn("border-t", x.status === "done" && "opacity-60")}>
                    <td className="px-3 py-2"><button type="button" className="text-left font-medium hover:underline" onClick={() => setEditTask(x)}>{x.title}</button>{x.status === "blocked" && x.blockedReason ? <p className="text-[11px] text-red-400">{x.blockedReason}</p> : null}</td>
                    <td className="px-3 py-2 text-xs">{memberName(x.assigneeMemberId)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{milestones.find((m) => m.id === x.milestoneId)?.title ?? "—"}</td>
                    <td className="px-3 py-2"><NativeSelect value={x.status} onChange={(v) => start(async () => { await setTaskStatus(projectId, x.id, v as TaskStatus); refresh(); })} className="w-36" options={TASK_STATUSES.map((s) => ({ value: s, label: t.taskStatuses[s] }))} /></td>
                    <td className="px-3 py-2"><PriorityBadge priority={x.priority} dict={dict} /></td>
                    <td className="px-3 py-2 text-right text-xs tabular-nums">{interpolate(t.hoursCompare, { actual: x.actualHours ?? 0, estimated: x.estimatedHours ?? 0 })}</td>
                    <td className="px-3 py-2 text-xs tabular-nums">{formatDate(x.dueDate, locale)}</td>
                    <td className="px-3 py-2 text-right"><Button type="button" variant="ghost" size="icon-sm" aria-label={t.delete} className="text-muted-foreground hover:text-destructive" onClick={() => { if (window.confirm(t.confirmDelete)) start(async () => { await deleteTask(x.id); refresh(); }); }}><Trash2 /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>
      {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

function TaskForm({ projectId, task, milestones, members, onClose, onSaved }: { projectId: string; task: Task | null; milestones: Milestone[]; members: ProjectMember[]; onClose: () => void; onSaved: () => void }) {
  const { dict } = useI18n();
  const t = dict.projects.work;
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <form className="mb-4 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => { e.preventDefault(); const data = Object.fromEntries(new FormData(e.currentTarget).entries()); start(async () => { const r = await saveTask(projectId, { ...data, status }, task?.id); setFieldErrors(r.fieldErrors ?? {}); setError(r.error ?? null); if (!r.error) onSaved(); }); }}>
      <Field name="title" label={t.taskTitle} error={fieldErrors.title} className="sm:col-span-2"><Input id="title" name="title" defaultValue={task?.title ?? ""} required /></Field>
      <Field name="assigneeMemberId" label={t.assignee}><NativeSelect name="assigneeMemberId" defaultValue={task?.assigneeMemberId ?? ""} placeholder={t.unassigned} options={members.map((m) => ({ value: m.id, label: `${m.displayName} · ${m.projectRole}` }))} /></Field>
      <Field name="milestoneId" label={t.milestone}><NativeSelect name="milestoneId" defaultValue={task?.milestoneId ?? ""} placeholder={t.noMilestone} options={milestones.map((m) => ({ value: m.id, label: m.title }))} /></Field>
      <Field name="status" label={dict.projects.list.columns.status}><NativeSelect id="status" value={status} onChange={(v) => setStatus(v as TaskStatus)} options={TASK_STATUSES.map((s) => ({ value: s, label: t.taskStatuses[s] }))} /></Field>
      <Field name="priority" label={t.priority}><NativeSelect name="priority" defaultValue={task?.priority ?? "normal"} options={PRIORITIES.map((p) => ({ value: p, label: dict.projects.priorities[p] }))} /></Field>
      <Field name="estimatedHours" label={t.estimatedHours} error={fieldErrors.estimatedHours}><Input id="estimatedHours" name="estimatedHours" type="number" min={0} step="any" defaultValue={task?.estimatedHours ?? ""} className="text-right tabular-nums" /></Field>
      <Field name="actualHours" label={t.actualHours} error={fieldErrors.actualHours}><Input id="actualHours" name="actualHours" type="number" min={0} step="any" defaultValue={task?.actualHours ?? ""} className="text-right tabular-nums" /></Field>
      <Field name="startDate" label={t.startDate} error={fieldErrors.startDate}><Input id="startDate" name="startDate" type="date" defaultValue={task?.startDate ?? ""} /></Field>
      <Field name="dueDate" label={t.dueDate} error={fieldErrors.dueDate}><Input id="dueDate" name="dueDate" type="date" defaultValue={task?.dueDate ?? ""} /></Field>
      {status === "blocked" ? <Field name="blockedReason" label={t.blockedReason} className="sm:col-span-2"><Input id="blockedReason" name="blockedReason" defaultValue={task?.blockedReason ?? ""} /></Field> : null}
      <Field name="description" label={t.description} className="sm:col-span-2 xl:col-span-4"><Textarea id="description" name="description" rows={2} defaultValue={task?.description ?? ""} /></Field>
      <div className="flex items-center gap-2 sm:col-span-2 xl:col-span-4">
        <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{t.save}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>{t.cancel}</Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </form>
  );
}
