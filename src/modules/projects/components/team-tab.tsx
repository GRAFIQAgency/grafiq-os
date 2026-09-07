"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { DetailSection } from "@/components/shared/detail-section";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { formatHours, formatMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";
import type { RoleCost } from "@/modules/settings/types";

import { addMember, removeMember, updateMember } from "../actions/members";
import { MEMBER_STATUSES } from "../constants";
import { suggestRate } from "../services/rates";
import type { PersonOption, ProjectMember, Task } from "../types";
import { Field, NativeSelect } from "./form-primitives";

const STATUS_TONE = { planned: "discovered", active: "approved", completed: "reviewed", removed: "archived" } as const;

export function TeamTab({ projectId, currency, members, tasks, people, roleCosts }: { projectId: string; currency: string; members: ProjectMember[]; tasks: Task[]; people: PersonOption[]; roleCosts: RoleCost[] }) {
  const router = useRouter();
  const { dict, locale } = useI18n();
  const t = dict.projects.team;
  const [open, setOpen] = useState(members.length === 0);
  const [person, setPerson] = useState("");
  const [role, setRole] = useState("");
  const [rate, setRate] = useState("");
  const [rateCurrency, setRateCurrency] = useState<string>(currency);
  const [rateSource, setRateSource] = useState<"talent" | "role_default" | "manual">("manual");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const selected = useMemo(() => {
    const [kind, id] = person.split(":");
    return people.find((p) => p.kind === kind && p.id === id) ?? null;
  }, [person, people]);
  const suggestion = useMemo(() => suggestRate(selected, role || null, roleCosts), [selected, role, roleCosts]);

  function applySuggestion(next: { person?: string; role?: string }) {
    const [kind, id] = (next.person ?? person).split(":");
    const p = people.find((x) => x.kind === kind && x.id === id) ?? null;
    const s = suggestRate(p, (next.role ?? role) || null, roleCosts);
    if (s.rate != null) {
      setRate(String(s.rate));
      setRateCurrency(s.currency ?? currency);
      setRateSource(s.source);
    }
  }

  const options = [
    ...people.filter((p) => p.kind === "talent").map((p) => ({ value: `talent:${p.id}`, label: `${p.label}${p.hint ? ` · ${p.hint}` : ""}` })),
    ...people.filter((p) => p.kind === "user").map((p) => ({ value: `user:${p.id}`, label: `${p.label} (${t.internalUsers})` })),
  ];

  return (
    <div className="space-y-6" data-guide="projects-team">
      <DetailSection title={t.title} action={<Button size="sm" variant={open ? "ghost" : "default"} onClick={() => setOpen((v) => !v)}><Plus data-icon="inline-start" />{t.addMember}</Button>}>
        <p className="mb-4 text-xs text-muted-foreground">{t.description}</p>
        {open ? (
          <form className="mb-6 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const data = Object.fromEntries(new FormData(form).entries());
            start(async () => {
              const r = await addMember(projectId, { ...data, person, rateSource });
              setFieldErrors(r.fieldErrors ?? {});
              setMessage(r.error ?? null);
              if (!r.error) { form.reset(); setPerson(""); setRole(""); setRate(""); setOpen(false); router.refresh(); }
            });
          }}>
            <Field name="person" label={t.person} error={fieldErrors.person} className="xl:col-span-2">
              <NativeSelect id="person" value={person} onChange={(v) => { setPerson(v); applySuggestion({ person: v }); }} placeholder={people.length ? "—" : t.noPeople} options={options} />
            </Field>
            <Field name="projectRole" label={t.role} error={fieldErrors.projectRole}>
              <Input id="projectRole" name="projectRole" value={role} onChange={(e) => setRole(e.target.value)} onBlur={() => applySuggestion({})} placeholder={t.rolePlaceholder} list="project-roles" />
              <datalist id="project-roles">{roleCosts.map((r) => <option key={r.id} value={r.name} />)}</datalist>
            </Field>
            <Field name="status" label={t.status}><NativeSelect name="status" defaultValue="active" options={MEMBER_STATUSES.filter((s) => s !== "removed").map((s) => ({ value: s, label: t.statuses[s] }))} /></Field>
            <div className="grid grid-cols-[1fr_auto] gap-2 xl:col-span-2">
              <Field name="costRate" label={t.costRate} error={fieldErrors.costRate} hint={suggestion.rate != null ? interpolate(t.suggested, { rate: suggestion.rate, currency: suggestion.currency ?? "", source: t.rateSources[suggestion.source] }) : selected ? t.noSuggestion : undefined}>
                <Input id="costRate" name="costRate" type="number" min={0} step="any" value={rate} onChange={(e) => { setRate(e.target.value); setRateSource("manual"); }} className="text-right tabular-nums" />
              </Field>
              <Field name="currency" label={t.currency}><NativeSelect name="currency" value={rateCurrency} onChange={setRateCurrency} className="w-24" options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></Field>
            </div>
            <Field name="plannedHours" label={t.plannedHours} error={fieldErrors.plannedHours} hint={t.plannedHoursHint} className="[&]:scroll-mt-20" ><div data-guide="projects-member-hours"><Input id="plannedHours" name="plannedHours" type="number" min={0} step="any" className="text-right tabular-nums" /></div></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field name="startsOn" label={t.startsOn}><Input id="startsOn" name="startsOn" type="date" /></Field>
              <Field name="endsOn" label={t.endsOn}><Input id="endsOn" name="endsOn" type="date" /></Field>
            </div>
            <Field name="notes" label={t.notes} className="sm:col-span-2 xl:col-span-3"><Input id="notes" name="notes" /></Field>
            <div className="flex items-end gap-2">
              <Button type="submit" size="sm" disabled={pending || !person} data-guide="projects-add-member">{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{t.save}</Button>
              {message ? <span className="text-xs text-destructive">{message}</span> : null}
            </div>
          </form>
        ) : null}

        {members.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/30 text-xs text-muted-foreground"><tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>{t.person}</th><th>{t.role}</th><th>{t.status}</th><th className="text-right!">{t.costRate}</th><th>{t.plannedHours}</th><th>{t.startsOn} – {t.endsOn}</th><th /></tr></thead>
              <tbody>
                {members.map((m) => {
                  const mine = tasks.filter((x) => x.assigneeMemberId === m.id);
                  const actual = mine.reduce((s, x) => s + (x.actualHours ?? 0), 0);
                  const capacityHref = `${getModule("capacity").href}/${encodeURIComponent(m.talentCandidateId ? `talent:${m.talentCandidateId}` : `user:${m.userId}`)}`;
                  return <MemberRow key={m.id} member={m} actualHours={actual} projectId={projectId} onDone={() => router.refresh()} tone={STATUS_TONE[m.status]} labels={{ status: t.statuses[m.status], remove: t.remove, confirm: t.confirmRemove, snapshot: t.snapshot, source: t.rateSources[m.rateSource], hours: interpolate(t.hoursSummary, { actual: formatHours(actual, locale), planned: formatHours(m.plannedHours, locale) }), open: t.openInTalent, rate: formatMoney(m.costRate, m.currency, locale), capacity: t.viewCapacity }} talentHref={m.talentCandidateId ? `${getModule("talent").href}/${m.talentCandidateId}` : null} capacityHref={capacityHref} />;
                })}
              </tbody>
            </table>
          </div>
        )}
      </DetailSection>
    </div>
  );
}

function MemberRow({ member: m, projectId, actualHours, onDone, tone, labels, talentHref, capacityHref }: { member: ProjectMember; projectId: string; actualHours: number; onDone: () => void; tone: string; labels: Record<string, string>; talentHref: string | null; capacityHref: string }) {
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  const t = dict.projects.team;
  void actualHours;
  return (
    <tr className={m.status === "removed" ? "border-t opacity-50" : "border-t"}>
      <td className="px-3 py-2">{talentHref ? <Link href={talentHref} className="font-medium hover:underline">{m.displayName}</Link> : <span className="font-medium">{m.displayName}</span>}</td>
      <td className="px-3 py-2">{m.projectRole}</td>
      <td className="px-3 py-2">
        <NativeSelect value={m.status} onChange={(v) => start(async () => { await updateMember(m.id, { status: v, projectRole: m.projectRole, plannedHours: m.plannedHours ?? "", startsOn: m.startsOn ?? "", endsOn: m.endsOn ?? "", costRate: undefined, currency: m.currency ?? "", notes: m.notes ?? "" }); onDone(); })} className="w-32" options={MEMBER_STATUSES.map((s) => ({ value: s, label: t.statuses[s] }))} />
        <span className="sr-only"><StatusBadge status={tone} label={labels.status} /></span>
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{labels.rate}<span className="block text-[11px] text-muted-foreground">{labels.snapshot} · {labels.source}</span></td>
      <td className="px-3 py-2 text-xs">
        {labels.hours}
        {m.status !== "removed" ? <Link href={capacityHref} className="block text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">{labels.capacity}</Link> : null}
      </td>
      <td className="px-3 py-2 text-xs text-muted-foreground">{[m.startsOn, m.endsOn].filter(Boolean).join(" – ") || "—"}</td>
      <td className="px-3 py-2 text-right">
        {m.status !== "removed" ? (
          <Button type="button" variant="ghost" size="icon-sm" disabled={pending} aria-label={labels.remove} onClick={() => { if (window.confirm(labels.confirm)) start(async () => { await removeMember(projectId, m.id); onDone(); }); }} className="text-muted-foreground hover:text-destructive">
            <Trash2 />
          </Button>
        ) : null}
      </td>
    </tr>
  );
}
