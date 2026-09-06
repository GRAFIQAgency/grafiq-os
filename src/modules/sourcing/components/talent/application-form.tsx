"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

import { submitApplication } from "../../actions/inbound";
import { TalentFormFields } from "./talent-form-fields";

/** Public candidate application form (no login). */
export function ApplicationForm() {
  const { dict } = useI18n();
  const t = dict.sourcing.apply;
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center">
        <h2 className="text-lg font-semibold">{t.thanksTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.thanksBody}</p>
      </div>
    );
  }

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          const result = await submitApplication(data);
          if (result.ok) {
            setDone(true);
            return;
          }
          setFieldErrors(result.fieldErrors ?? {});
          setError(result.error ?? null);
        });
      }}
    >
      {/* Honeypot: hidden from people, filled by bots. */}
      <input type="text" name="company_website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <TalentFormFields fieldErrors={fieldErrors} showConsent />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Send data-icon="inline-start" />}
          {pending ? t.sending : t.submit}
        </Button>
        {error ? <span className="text-sm text-destructive">{error}</span> : null}
        <span className="text-xs text-muted-foreground">{t.privacy}</span>
      </div>
    </form>
  );
}
