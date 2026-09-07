"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { CompanyContact } from "@/modules/sourcing/types";

import { addContact, deleteContact } from "../actions";

/** Contacts live on the shared company record (company_contacts); Sales is where they are maintained. */
export function ContactsEditor({ companyId, contacts }: { companyId: string; contacts: CompanyContact[] }) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sales.contacts;
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3" data-guide="sales-contacts">
      {contacts.length === 0 ? <p className="text-sm text-muted-foreground">{t.empty}</p> : (
        <ul className="space-y-2 text-sm">
          {contacts.map((k) => (
            <li key={k.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
              <div className="min-w-0">
                <p className="font-medium">{k.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {[k.jobTitle, k.email ? <a key="e" href={`mailto:${k.email}`} className="hover:underline">{k.email}</a> : null, k.phone].filter(Boolean).map((x, i) => <span key={i}>{i > 0 ? " · " : ""}{x}</span>)}
                </p>
                {k.profileUrl ? <a href={k.profileUrl} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground underline-offset-2 hover:underline">{k.profileUrl.replace(/^https?:\/\//, "").slice(0, 40)}</a> : null}
              </div>
              <button type="button" disabled={pending} onClick={() => start(async () => { await deleteContact(companyId, k.id); router.refresh(); })} className="text-muted-foreground hover:text-foreground" aria-label={`${t.remove} ${k.name}`}>
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open ? (
        <form
          className="grid grid-cols-1 gap-2 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = e.currentTarget;
            start(async () => {
              const r = await addContact(companyId, Object.fromEntries(new FormData(f).entries()));
              setFieldErrors(r.fieldErrors ?? {});
              setError(r.error ?? null);
              if (!r.error) { f.reset(); setOpen(false); router.refresh(); }
            });
          }}
        >
          <Input name="name" placeholder={t.name} required aria-invalid={Boolean(fieldErrors.name)} />
          <Input name="jobTitle" placeholder={t.jobTitle} />
          <Input name="email" type="email" placeholder={t.email} aria-invalid={Boolean(fieldErrors.email)} />
          <Input name="phone" placeholder={t.phone} />
          <Input name="profileUrl" placeholder={t.profileUrl} className="sm:col-span-2" aria-invalid={Boolean(fieldErrors.profileUrl)} />
          {error ? <p className="text-xs text-destructive sm:col-span-2">{error}</p> : null}
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" size="sm" disabled={pending}>{pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}{t.save}</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>{dict.sales.detail.cancel}</Button>
          </div>
        </form>
      ) : (
        <Button type="button" variant="ghost" size="xs" onClick={() => setOpen(true)}><Plus data-icon="inline-start" />{t.add}</Button>
      )}
    </div>
  );
}
