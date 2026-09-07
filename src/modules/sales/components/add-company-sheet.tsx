"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { INDUSTRIES } from "@/modules/sourcing/constants";

import { addCompanyToPipeline } from "../actions";

/** "+ Add company": same normalisation + dedupe as Sourcing manual entry, then straight into the pipeline. */
export function AddCompanySheet() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sales.add;
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;
    start(async () => {
      const result = await addCompanyToPipeline(data);
      if (result.error) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        return;
      }
      setFieldErrors({});
      setMessage(result.merged ? t.savedMerged : t.savedNew);
      form.reset();
      setOpen(false);
      router.refresh();
      if (result.id) router.push(`${getModule("sales").href}/${result.id}`);
    });
  }

  const field = (name: string, label: string, input: React.ReactNode) => (
    <div>
      <Label htmlFor={name} className="mb-1.5 block text-xs text-muted-foreground">{label}</Label>
      {input}
      {fieldErrors[name] ? <p className="mt-1 text-xs text-destructive">{fieldErrors[name]}</p> : null}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" data-guide="sales-add-company">
          <Building2 data-icon="inline-start" />
          {t.button}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t.button}</SheetTitle>
          <SheetDescription>{t.description}</SheetDescription>
        </SheetHeader>
        <form className="space-y-4 px-4 pb-6" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
          {field("name", t.name, <Input id="name" name="name" required aria-invalid={Boolean(fieldErrors.name)} />)}
          {field("website", t.website, <Input id="website" name="website" placeholder="https://" aria-invalid={Boolean(fieldErrors.website)} />)}
          <div className="grid grid-cols-2 gap-3">
            {field("country", t.country, <Input id="country" name="country" />)}
            {field("industry", t.industry, (
              <>
                <Input id="industry" name="industry" list="sales-industries" />
                <datalist id="sales-industries">{INDUSTRIES.map((i) => <option key={i} value={i} />)}</datalist>
              </>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              {pending ? t.saving : t.submit}
            </Button>
            {message ? <span className={Object.keys(fieldErrors).length ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</span> : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
