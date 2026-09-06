"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

import { addTalentManually } from "../../actions/manual";
import { formDataToObject } from "../../services/talent-input";
import { TalentFormFields } from "./talent-form-fields";

/** Side panel for adding a candidate by hand (referral, platform find). */
export function AddTalentSheet() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.sourcing.talentInput;
  const [open, setOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(form: HTMLFormElement) {
    const data = formDataToObject(new FormData(form));
    start(async () => {
      const result = await addTalentManually(data);
      if (result.error) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage(result.error);
        return;
      }
      setFieldErrors({});
      setMessage(result.merged ? t.savedMerged : t.savedNew);
      form.reset();
      router.refresh();
      if (result.id) router.push(`${getModule("sourcing").href}/talent/${result.id}`);
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <UserPlus data-icon="inline-start" />
          {t.open}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>{t.addTitle}</SheetTitle>
          <SheetDescription>{t.addDescription}</SheetDescription>
        </SheetHeader>
        <form
          className="space-y-5 px-4 pb-6"
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
        >
          <TalentFormFields fieldErrors={fieldErrors} showSourceUrl />
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
