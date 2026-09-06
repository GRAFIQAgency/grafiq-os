"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

import { chapterForPath, stepHref, stepsForChapter } from "../content";
import { useGuideProgress } from "../progress";

/** "?" in the top bar: the guide chapter for the current page, with a tour shortcut. */
export function GuideHelpButton() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const { done, toggle } = useGuideProgress();
  const [open, setOpen] = useState(false);
  const chapter = chapterForPath(pathname);
  const steps = chapter ? stepsForChapter(chapter.id) : [];
  const chapterText = chapter ? dict.guide.chapters[chapter.id] : null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={dict.guide.help} data-guide="guide-help">
          <CircleHelp />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{chapterText?.title ?? dict.guide.helpTitle}</SheetTitle>
          <SheetDescription>{chapterText?.intro ?? dict.modules.guide.description}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 pb-6">
          {steps.length ? (
            <ul className="space-y-3">
              {steps.map((step) => {
                const text = dict.guide.steps[step.id as keyof typeof dict.guide.steps];
                return (
                  <li key={step.id} className="flex items-start gap-3 rounded-md border px-3 py-2">
                    <Checkbox checked={done.has(step.id)} onCheckedChange={() => toggle(step.id)} aria-label={dict.guide.markDone} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{text?.title}</p>
                      <p className="text-xs text-muted-foreground">{text?.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {steps[0] ? (
              <Link href={stepHref(steps[0])} onClick={() => setOpen(false)} className={buttonVariants({ size: "sm" })}>
                {dict.guide.startTour}
              </Link>
            ) : null}
            <Link href={getModule("guide").href} onClick={() => setOpen(false)} className={buttonVariants({ size: "sm", variant: "outline" })}>
              {dict.guide.openGuide}
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
