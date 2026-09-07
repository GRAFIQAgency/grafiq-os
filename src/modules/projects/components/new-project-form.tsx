"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CURRENCIES } from "@/config/currencies";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { addClientCompany, createProject } from "../actions/projects";
import { PRIORITIES, PROJECT_TYPES } from "../constants";
import type { ProjectPickers } from "../queries";
import { Field, NativeSelect } from "./form-primitives";

interface Prefill { id: string; name: string; clientName: string | null; currency: string; revenue: number; directCost: number; targetMargin: number }

export function NewProjectForm({ pickers, prefill }: { pickers: ProjectPickers; prefill: Prefill | null }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.projects.create;
  const [estimateId, setEstimateId] = useState(prefill?.id ?? "");
  const [clients, setClients] = useState(pickers.clients);
  const [clientId, setClientId] = useState(() => (prefill?.clientName ? pickers.clients.find((c) => c.label.toLowerCase() === prefill.clientName!.toLowerCase())?.id ?? "" : ""));
  const [addingClient, setAddingClient] = useState(false);
  const [newClient, setNewClient] = useState({ name: prefill?.clientName ?? "", website: "", country: "" });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [clientPending, startClient] = useTransition();

  function chooseEstimate(id: string) {
    setEstimateId(id);
    if (id) router.push(`${getModule("projects").href}/new?estimate=${id}`);
    else router.push(`${getModule("projects").href}/new`);
  }

  function addClient() {
    startClient(async () => {
      const r = await addClientCompany(newClient);
      if (r.error || !r.id) {
        setMessage(r.error ?? null);
        return;
      }
      setClients((prev) => (prev.some((c) => c.id === r.id) ? prev : [...prev, { id: r.id!, label: r.name ?? newClient.name }].sort((a, b) => a.label.localeCompare(b.label))));
      setClientId(r.id);
      setAddingClient(false);
      setMessage(t.clientAdded);
    });
  }

  function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries());
    start(async () => {
      const r = await createProject({ ...data, clientId, estimateId: estimateId || null });
      if (r.error) {
        setFieldErrors(r.fieldErrors ?? {});
        setMessage(r.error);
        return;
      }
      router.push(`${getModule("projects").href}/${r.id}`);
    });
  }

  return (
    <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
      <Card data-guide="projects-source">
        <CardHeader>
          <CardTitle>{t.fromEstimate}</CardTitle>
          <CardDescription>{t.fromEstimateHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <Field name="estimate" label={t.estimate}>
            <NativeSelect id="estimate" value={estimateId} onChange={chooseEstimate} placeholder={t.noEstimate}
              options={pickers.estimates.map((e) => ({ value: e.id, label: `${e.label}${e.hint ? ` · ${e.hint}` : ""}${e.used ? ` (${t.estimateUsed})` : ""}` }))} />
          </Field>
          {prefill ? <p className="mt-2 text-xs text-muted-foreground">{interpolate(t.estimateLoaded, { name: prefill.name })}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>{t.title}</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Field name="name" label={t.name} error={fieldErrors.name} className="xl:col-span-2">
            <Input id="name" name="name" defaultValue={prefill?.name ?? ""} required aria-invalid={Boolean(fieldErrors.name)} />
          </Field>
          <Field name="projectType" label={t.type}>
            <NativeSelect name="projectType" defaultValue="website" options={PROJECT_TYPES.map((v) => ({ value: v, label: dict.projects.types[v] }))} />
          </Field>

          <div className="sm:col-span-2 xl:col-span-3" data-guide="projects-client">
            <Field name="clientId" label={t.client}>
              <div className="flex flex-wrap gap-2">
                <NativeSelect id="clientId" value={clientId} onChange={setClientId} placeholder={t.noClient} className="flex-1" options={clients.map((c) => ({ value: c.id, label: c.hint ? `${c.label} · ${c.hint}` : c.label }))} />
                <Button type="button" variant="outline" size="sm" className="h-8" onClick={() => setAddingClient((v) => !v)}>
                  <Plus data-icon="inline-start" />
                  {t.addClient}
                </Button>
              </div>
            </Field>
            {addingClient ? (
              <div className="mt-3 grid grid-cols-1 gap-3 rounded-md border p-3 sm:grid-cols-4">
                <Field name="newClientName" label={t.companyName}><Input id="newClientName" value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} /></Field>
                <Field name="newClientWebsite" label={t.website}><Input id="newClientWebsite" value={newClient.website} onChange={(e) => setNewClient({ ...newClient, website: e.target.value })} placeholder="example.com" /></Field>
                <Field name="newClientCountry" label={t.country}><Input id="newClientCountry" value={newClient.country} onChange={(e) => setNewClient({ ...newClient, country: e.target.value })} /></Field>
                <div className="flex items-end">
                  <Button type="button" size="sm" disabled={clientPending || !newClient.name.trim()} onClick={addClient}>
                    {clientPending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
                    {t.saveClient}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-4">{t.addClientHint}</p>
              </div>
            ) : null}
          </div>

          <Field name="ownerId" label={t.owner}><NativeSelect name="ownerId" placeholder={t.noOwner} options={pickers.owners.map((o) => ({ value: o.id, label: o.label }))} /></Field>
          <Field name="priority" label={t.priority}><NativeSelect name="priority" defaultValue="normal" options={PRIORITIES.map((v) => ({ value: v, label: dict.projects.priorities[v] }))} /></Field>
          <Field name="startDate" label={t.startDate} error={fieldErrors.startDate}><Input id="startDate" name="startDate" type="date" /></Field>
          <Field name="deadline" label={t.deadline} error={fieldErrors.deadline}><Input id="deadline" name="deadline" type="date" /></Field>

          <div className="grid grid-cols-1 gap-4 sm:col-span-2 sm:grid-cols-4 xl:col-span-3" data-guide="projects-baseline">
            <Field name="currency" label={t.currency}><NativeSelect name="currency" defaultValue={prefill?.currency ?? pickers.defaults.currency} options={CURRENCIES.map((c) => ({ value: c, label: c }))} /></Field>
            <Field name="baselineRevenue" label={t.revenue} error={fieldErrors.baselineRevenue}><Input id="baselineRevenue" name="baselineRevenue" type="number" min={0} step="any" defaultValue={prefill?.revenue ?? ""} className="text-right tabular-nums" /></Field>
            <Field name="baselineDirectCost" label={t.directCost} error={fieldErrors.baselineDirectCost}><Input id="baselineDirectCost" name="baselineDirectCost" type="number" min={0} step="any" defaultValue={prefill?.directCost ?? ""} className="text-right tabular-nums" /></Field>
            <Field name="baselineTargetMargin" label={t.targetMargin} error={fieldErrors.baselineTargetMargin}><Input id="baselineTargetMargin" name="baselineTargetMargin" type="number" min={0} max={99.99} step="any" defaultValue={prefill?.targetMargin ?? pickers.defaults.targetMargin} className="text-right tabular-nums" /></Field>
            <p className="text-xs text-muted-foreground sm:col-span-4">{t.baselineNote}</p>
          </div>

          <Field name="contactName" label={t.contactName}><Input id="contactName" name="contactName" /></Field>
          <Field name="contactEmail" label={t.contactEmail}><Input id="contactEmail" name="contactEmail" type="email" /></Field>
          <Field name="contactPhone" label={t.contactPhone}><Input id="contactPhone" name="contactPhone" /></Field>
          <Field name="notes" label={t.notes} className="sm:col-span-2 xl:col-span-3"><Textarea id="notes" name="notes" rows={3} /></Field>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending} data-guide="projects-create-submit">
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
          {pending ? t.creating : t.submit}
        </Button>
        {message ? <span className={Object.keys(fieldErrors).length || message.includes(":") ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</span> : null}
      </div>
    </form>
  );
}
