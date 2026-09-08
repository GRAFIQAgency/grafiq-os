import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import type { DueBucket, PayableStatus, ReceivableStatus } from "../types";

const TONE: Record<ReceivableStatus | PayableStatus, string> = {
  scheduled: "text-muted-foreground",
  invoiced: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  partially_paid: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  paid: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  overdue: "border-red-500/30 bg-red-500/10 text-red-400",
  cancelled: "text-muted-foreground opacity-70 line-through",
};

export const BUCKET_TONE: Record<DueBucket, string> = {
  overdue: "text-red-400",
  due_soon: "text-amber-400",
  upcoming: "text-sky-400",
  paid: "text-emerald-400",
  cancelled: "text-muted-foreground",
};

export function ItemStatusBadge({ status, dict, className }: { status: ReceivableStatus | PayableStatus; dict: Dictionary; className?: string }) {
  return <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap", TONE[status], className)}>{dict.finance.statuses[status]}</span>;
}
