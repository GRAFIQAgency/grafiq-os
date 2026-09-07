import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  discovered: "text-muted-foreground",
  reviewed: "text-foreground",
  shortlisted: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  contacted: "border-sky-500/30 bg-sky-500/10 text-sky-400",
  interview: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  trial: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  qualified: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  preferred: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rejected: "border-red-500/30 bg-red-500/10 text-red-400",
  archived: "text-muted-foreground opacity-70",
};

export function StatusBadge({ status, label, className }: { status: string; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium whitespace-nowrap", TONES[status] ?? "", className)}>
      {label}
    </span>
  );
}
