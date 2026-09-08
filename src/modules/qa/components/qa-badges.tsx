import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/config";

import type { QaChecklistStatus, QaItemStatus } from "../types";

/** One restrained palette for every QA colour in the module. */
export const CHECKLIST_TONE: Record<QaChecklistStatus, string> = {
  not_started: "text-muted-foreground",
  in_progress: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  needs_fixes: "border-red-500/30 bg-red-500/10 text-red-400",
  ready_for_review: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
};

export const ITEM_TONE: Record<QaItemStatus, string> = {
  pending: "text-muted-foreground",
  pass: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  fail: "border-red-500/30 bg-red-500/10 text-red-400",
  na: "text-muted-foreground opacity-70",
  blocked: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

/** Active-state classes for the inline Pass / Fail / N/A / Blocked buttons. */
export const ITEM_BUTTON_ACTIVE: Record<QaItemStatus, string> = {
  pending: "bg-muted text-foreground",
  pass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  fail: "bg-red-500/20 text-red-300 border-red-500/40",
  na: "bg-muted text-muted-foreground border-border",
  blocked: "bg-amber-500/20 text-amber-300 border-amber-500/40",
};

export function ChecklistStatusBadge({ status, dict, className }: { status: QaChecklistStatus; dict: Dictionary; className?: string }) {
  return <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap", CHECKLIST_TONE[status], className)}>{dict.qa.statuses[status]}</span>;
}

export function ItemStatusBadge({ status, dict, className }: { status: QaItemStatus; dict: Dictionary; className?: string }) {
  return <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap", ITEM_TONE[status], className)}>{dict.qa.itemStatuses[status]}</span>;
}

/** Small progress bar: resolved share, red segment for failed / blocked. */
export function QaProgressBar({ percent, failedShare = 0, className }: { percent: number; failedShare?: number; className?: string }) {
  return (
    <div className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-muted", className)} aria-hidden>
      <div className="h-full rounded-full bg-emerald-500/70" style={{ width: `${Math.min(100, percent)}%` }} />
      {failedShare > 0 ? <div className="absolute inset-y-0 left-0 h-full rounded-full bg-red-500/80" style={{ width: `${Math.min(100, failedShare)}%` }} /> : null}
    </div>
  );
}
