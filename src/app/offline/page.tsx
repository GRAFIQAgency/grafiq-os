import type { Metadata } from "next";

import { GrafiqLogo } from "@/components/shared/grafiq-logo";
import { getDictionary } from "@/lib/i18n/server";

export const metadata: Metadata = { title: "Offline" };

/** Served by the service worker when a page cannot be loaded. */
export default async function OfflinePage() {
  const dict = await getDictionary();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <GrafiqLogo className="size-14 rounded-xl border border-white/10" />
      <h1 className="text-xl font-semibold tracking-tight">{dict.pwa.offlineTitle}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">{dict.pwa.offlineBody}</p>
    </div>
  );
}
