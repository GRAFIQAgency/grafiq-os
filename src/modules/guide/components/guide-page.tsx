"use client";

import Link from "next/link";
import { Play, RotateCcw } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useI18n } from "@/lib/i18n/client";
import { interpolate } from "@/lib/i18n/interpolate";

import { GUIDE_CHAPTERS, GUIDE_STEPS, plannedModules, stepHref, stepsForChapter } from "../content";
import { useGuideProgress } from "../progress";

export function GuidePage() {
  const { dict } = useI18n();
  const { done, toggle, reset, percent } = useGuideProgress();
  const t = dict.guide;
  const planned = plannedModules();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-sm font-medium">{interpolate(t.progress, { percent })}</p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={stepHref(GUIDE_STEPS[0])} className={buttonVariants({ size: "sm" })}>
            <Play data-icon="inline-start" />
            {t.startFromBeginning}
          </Link>
          <Button size="sm" variant="ghost" onClick={reset}>
            <RotateCcw data-icon="inline-start" />
            {t.reset}
          </Button>
        </div>
      </div>

      {GUIDE_CHAPTERS.map((chapter) => {
        const text = t.chapters[chapter.id];
        const steps = stepsForChapter(chapter.id);
        return (
          <Card key={chapter.id} className="gap-4">
            <CardHeader>
              <CardTitle>{text.title}</CardTitle>
              <CardDescription>{text.intro}</CardDescription>
            </CardHeader>
            <CardContent>
              {chapter.id === "next" ? (
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {planned.map((m) => {
                    const Icon = m.icon;
                    return (
                      <li key={m.id} className="flex items-start gap-3 rounded-md border border-dashed px-3 py-2">
                        <Icon className="mt-0.5 size-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">{dict.modules[m.id].title} <span className="text-xs font-normal text-muted-foreground">· {t.plannedLabel}</span></p>
                          <p className="text-xs text-muted-foreground">{dict.modules[m.id].description}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <ol className="space-y-2">
                  {steps.map((step, i) => {
                    const s = t.steps[step.id as keyof typeof t.steps];
                    const isDone = done.has(step.id);
                    return (
                      <li key={step.id} className={cn("flex items-start gap-3 rounded-md border px-3 py-2.5", isDone && "opacity-70")}>
                        <Checkbox checked={isDone} onCheckedChange={() => toggle(step.id)} aria-label={t.markDone} className="mt-1" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium"><span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>{s.title}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{s.body}</p>
                        </div>
                        <Link href={stepHref(step)} className={buttonVariants({ size: "xs", variant: "outline" })}>
                          {t.goThere}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
