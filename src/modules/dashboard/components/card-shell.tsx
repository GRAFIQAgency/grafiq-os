import type { ReactNode } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import type { Loaded } from "../types";

/**
 * One dashboard card. Renders the module's own "unavailable" or "not set up"
 * state instead of numbers when its read failed or it has no data yet, so one
 * broken module never blanks the page.
 */
export function DashboardCard<T>({ title, loaded, dict, href, linkLabel, empty, emptyHint, anchor, className, children }: {
  title: string;
  loaded: Loaded<T>;
  dict: Dictionary;
  href?: string;
  linkLabel?: string;
  empty?: string;
  emptyHint?: string;
  anchor?: string;
  className?: string;
  children: (data: T) => ReactNode;
}) {
  const t = dict.dashboard;
  return (
    <Card className={cn("gap-4", className)} data-guide={anchor}>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle>{title}</CardTitle>
        {href && linkLabel ? <Link href={href} className={buttonVariants({ size: "xs", variant: "ghost" })}>{linkLabel}</Link> : null}
      </CardHeader>
      <CardContent>
        {loaded.state === "error" ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium text-muted-foreground">{t.unavailable}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t.unavailableHint}</p>
          </div>
        ) : loaded.state === "unconfigured" ? (
          <div className="rounded-md border border-dashed px-4 py-6 text-center">
            <p className="text-sm font-medium">{empty ?? t.notConfigured}</p>
            {emptyHint ? <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{emptyHint}</p> : null}
            {href && linkLabel ? <Link href={href} className={cn(buttonVariants({ size: "sm", variant: "outline" }), "mt-3")}>{linkLabel}</Link> : null}
          </div>
        ) : (
          children(loaded.data)
        )}
      </CardContent>
    </Card>
  );
}

/** Compact label + value used across the dashboard cards. */
export function Metric({ label, value, hint, tone = "default", className }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "default" | "risk" | "positive" | "muted"; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-lg font-semibold tracking-tight tabular-nums", tone === "risk" && "text-red-400", tone === "positive" && "text-emerald-400", tone === "muted" && "text-muted-foreground")}>{value}</p>
      {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
