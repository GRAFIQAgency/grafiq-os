"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/lib/i18n/config";

/** EN / CS toggle in the top bar. Persists the choice in a cookie. */
export function LanguageSwitcher() {
  const { locale, dict } = useI18n();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="radiogroup"
      aria-label={dict.common.language}
      data-guide="language-switcher"
      className={cn("flex h-8 items-center rounded-md border bg-muted/30 p-0.5", isPending && "opacity-60")}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => choose(code)}
            disabled={isPending}
            className={cn(
              "h-7 rounded-[5px] px-2 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
              active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {LOCALE_LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
