"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

import { createTemplate } from "../actions/templates";

export function NewTemplateButton() {
  const router = useRouter();
  const { dict } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      disabled={pending}
      data-guide="qa-new-template"
      onClick={() => start(async () => {
        const r = await createTemplate({ name: dict.qa.templates.newName, isActive: true });
        if (r.id) router.push(`${getModule("qa").href}/templates/${r.id}`);
        else if (r.error) window.alert(r.error);
      })}
    >
      {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <Plus data-icon="inline-start" />}
      {dict.qa.templates.newTemplate}
    </Button>
  );
}
