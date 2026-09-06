"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { GUIDE_STEPS, findStep, nextStep, previousStep, stepHref } from "../content";
import { useGuideProgress } from "../progress";

const HIGHLIGHT_CLASS = "guide-highlight";

/**
 * Cross-page tour. Mounted once in the app shell; active when the URL has
 * `?guide=<step-id>`. Highlights the element with the step's data-guide
 * anchor and shows a card with Previous / Next.
 */
export function GuideSpotlight() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { dict } = useI18n();
  const { markDone } = useGuideProgress();
  const step = findStep(searchParams.get("guide"));
  const index = useMemo(() => (step ? GUIDE_STEPS.findIndex((s) => s.id === step.id) : -1), [step]);

  useEffect(() => {
    if (!step?.anchor) return;
    const el = document.querySelector<HTMLElement>(`[data-guide="${step.anchor}"]`);
    if (!el) return;
    el.classList.add(HIGHLIGHT_CLASS);
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    return () => el.classList.remove(HIGHLIGHT_CLASS);
  }, [step]);

  if (!step) return null;

  const text = dict.guide.steps[step.id as keyof typeof dict.guide.steps];
  const chapter = dict.guide.chapters[step.chapterId];
  const prev = previousStep(step.id);
  const next = nextStep(step.id);

  const go = (target: typeof step | undefined) => {
    markDone(step.id);
    if (target) router.push(stepHref(target));
    else router.push(getModule("guide").href);
  };
  const close = () => router.push(pathname);

  return (
    <aside
      role="dialog"
      aria-label={dict.guide.tour}
      className="fixed right-4 bottom-4 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{chapter.title}</p>
          <p className="text-sm font-semibold">{text?.title}</p>
        </div>
        <Button variant="ghost" size="icon-xs" onClick={close} aria-label={dict.guide.close}>
          <X />
        </Button>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{text?.body}</p>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{interpolate(dict.guide.stepOf, { n: index + 1, total: GUIDE_STEPS.length })}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => go(prev)} disabled={!prev}>
            <ChevronLeft data-icon="inline-start" />
            {dict.guide.previous}
          </Button>
          <Button size="sm" onClick={() => go(next)}>
            {next ? dict.guide.next : dict.guide.done}
            {next ? <ChevronRight data-icon="inline-end" /> : null}
          </Button>
        </div>
      </div>
    </aside>
  );
}
