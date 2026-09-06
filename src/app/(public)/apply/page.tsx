import type { Metadata } from "next";

import { getDictionary } from "@/lib/i18n/server";
import { ApplicationForm } from "@/modules/sourcing/components/talent/application-form";

export async function generateMetadata(): Promise<Metadata> {
  const dict = await getDictionary();
  return { title: dict.sourcing.apply.title };
}

export default async function ApplyPage() {
  const dict = await getDictionary();
  return (
    <div className="space-y-8 py-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{dict.sourcing.apply.title}</h1>
        <p className="text-sm text-muted-foreground">{dict.sourcing.apply.intro}</p>
      </div>
      <ApplicationForm />
    </div>
  );
}
