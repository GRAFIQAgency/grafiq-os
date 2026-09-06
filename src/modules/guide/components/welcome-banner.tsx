"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BookOpen, X } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";

import { GUIDE_STEPS, stepHref } from "../content";
import { WELCOME_KEY, useGuideProgress } from "../progress";

/** Shown on the dashboard until the tour is started or dismissed. */
export function WelcomeBanner() {
  const { dict } = useI18n();
  const { done, loaded } = useGuideProgress();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDismissed(window.localStorage.getItem(WELCOME_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  if (!loaded || dismissed || done.size > 0) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(WELCOME_KEY, "1");
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
      <span className="flex size-9 items-center justify-center rounded-md border bg-muted/40 text-muted-foreground">
        <BookOpen className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{dict.guide.welcomeTitle}</p>
        <p className="text-xs text-muted-foreground">{dict.guide.welcomeBody}</p>
      </div>
      <div className="flex items-center gap-2">
        <Link href={stepHref(GUIDE_STEPS[0])} className={buttonVariants({ size: "sm" })} onClick={dismiss}>
          {dict.guide.welcomeStart}
        </Link>
        <Button size="sm" variant="ghost" onClick={dismiss}>
          {dict.guide.welcomeDismiss}
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={dismiss} aria-label={dict.guide.close}>
          <X />
        </Button>
      </div>
    </div>
  );
}
