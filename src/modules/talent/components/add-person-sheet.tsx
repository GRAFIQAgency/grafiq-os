"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { TalentFormFields } from "@/modules/sourcing/components/talent/talent-form-fields";
import { formDataToObject } from "@/modules/sourcing/services/talent-input";

import { addPersonToBench } from "../actions";

/** "+ Add person": same form and pipeline as Sourcing's manual entry, then straight onto the bench. */
export function AddPersonSheet() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.talent;
  const ti = dict.sourcing.talentInput;
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = formDataToObject(new FormData(form));
    start(async () => {
      const result = await addPersonToBench(data);
      if (result.error) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        return;
      }
      setFieldErrors({});
      setMessage(result.merged ? ti.savedMerged : ti.savedNew);
      form.reset();
      setOpen(false);
      router.refresh();
      if (result.id) router.push(`${getModule("talent").href}/${result.id}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" data-guide="talent-add-person">
          <UserPlus data-icon="inline-start" />
          {t.addPerson}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t.addPerson}</SheetTitle>
          <SheetDescription>{t.addPersonDescription}</SheetDescription>
        </SheetHeader>
        <form className="space-y-5 px-4 pb-6" onSubmit={(e) => { e.preventDefault(); submit(e.currentTarget); }}>
          <TalentFormFields fieldErrors={fieldErrors} showSourceUrl />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : null}
              {pending ? ti.saving : ti.submit}
            </Button>
            {message ? <span className={Object.keys(fieldErrors).length ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>{message}</span> : null}
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
