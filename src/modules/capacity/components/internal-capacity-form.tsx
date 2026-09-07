"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n/client";

import { saveInternalCapacity } from "../actions";

/** Monthly capacity of an internal user — the only thing Capacity writes. */
export function InternalCapacityForm({ profileId, initial }: { profileId: string; initial: { monthlyCapacityHours: number | null; preferredMonthlyHours: number | null; capacityActive: boolean; notes: string | null } }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.capacity.detail.internal;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const field = (name: string, label: string, input: React.ReactNode, hint?: string) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {input}
      {hint && !fieldErrors[name] ? <p className="mt-1 text-xs text-muted-foreground/70">{hint}</p> : null}
      {fieldErrors[name] ? <p className="mt-1 text-xs text-destructive">{fieldErrors[name]}</p> : null}
    </div>
  );

  return (
    <form
      className="space-y-4"
      data-guide="capacity-internal"
      onSubmit={(e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget).entries());
        start(async () => {
          const r = await saveInternalCapacity(profileId, data);
          setFieldErrors(r.fieldErrors ?? {});
          setMessage(r.error ?? t.saved);
          if (!r.error) router.refresh();
        });
      }}
    >
      <p className="text-xs text-muted-foreground">{t.hint}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {field("monthlyCapacityHours", t.monthly, <Input id="monthlyCapacityHours" name="monthlyCapacityHours" type="number" min={0} max={744} defaultValue={initial.monthlyCapacityHours ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.monthlyCapacityHours)} required />, t.monthlyHint)}
        {field("preferredMonthlyHours", t.preferred, <Input id="preferredMonthlyHours" name="preferredMonthlyHours" type="number" min={0} max={744} defaultValue={initial.preferredMonthlyHours ?? ""} className="text-right tabular-nums" aria-invalid={Boolean(fieldErrors.preferredMonthlyHours)} />, t.preferredHint)}
        <div className="sm:col-span-2">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="capacityActive" defaultChecked={initial.capacityActive} className="size-4 rounded border-input" />
            {t.active}
          </label>
        </div>
        <div className="sm:col-span-2">
          {field("notes", t.notes, <Input id="notes" name="notes" defaultValue={initial.notes ?? ""} aria-invalid={Boolean(fieldErrors.notes)} />)}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Save data-icon="inline-start" />}
          {t.save}
        </Button>
        {message ? <span className={Object.keys(fieldErrors).length ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>{message}</span> : null}
      </div>
    </form>
  );
}
