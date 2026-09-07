import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { Dictionary, Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import { shiftPeriod } from "../calculations/periods";
import { periodLabel } from "../services/format";
import { capacityHref, periodParams, type CapacityParams } from "../services/links";
import type { Period } from "../types";

/** ← previous · Today · next → plus the Month / Week switch. Pure links, so it works everywhere. */
export function PeriodNav({ period, params, path = "", dict, locale }: { period: Period; params: CapacityParams; path?: string; dict: Dictionary; locale: Locale }) {
  const t = dict.capacity.period;
  const kind = period.kind === "week" ? "week" : "month";
  const href = (p: Period) => capacityHref(params, periodParams(p), path);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3" data-guide="capacity-period">
      <div className="flex items-center gap-1">
        <Link href={href(shiftPeriod(period, -1))} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label={t.previous}><ChevronLeft /></Link>
        <Link href={capacityHref(params, { period: undefined }, path)} className={buttonVariants({ variant: "outline", size: "sm" })}>{t.today}</Link>
        <Link href={href(shiftPeriod(period, 1))} className={buttonVariants({ variant: "outline", size: "icon-sm" })} aria-label={t.next}><ChevronRight /></Link>
        <h2 className="ml-3 text-lg font-semibold tracking-tight">{periodLabel(period, dict, locale)}</h2>
      </div>
      <div className="flex items-center gap-1 rounded-md border p-0.5">
        {(["month", "week"] as const).map((k) => (
          <Link
            key={k}
            href={capacityHref(params, { kind: k === "week" ? "week" : undefined, period: undefined }, path)}
            aria-current={kind === k ? "page" : undefined}
            className={cn(buttonVariants({ variant: kind === k ? "secondary" : "ghost", size: "sm" }), "h-7")}
          >
            {t[k]}
          </Link>
        ))}
      </div>
    </div>
  );
}
