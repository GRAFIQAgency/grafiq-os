import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n/config";

import type { HealthStatus } from "../types";

const HEALTH_STYLES: Record<HealthStatus, { className: string; dot: string }> = {
  healthy: {
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400",
  },
  warning: {
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  bad: {
    className: "border-red-500/30 bg-red-500/10 text-red-400",
    dot: "bg-red-400",
  },
};

type HealthText = Dictionary["pricing"]["health"];

export function healthDescription(status: HealthStatus, text: HealthText): string {
  return text[`${status}Description`];
}

interface HealthBadgeProps {
  status: HealthStatus;
  /** dict.pricing.health */
  text: HealthText;
  size?: "sm" | "md";
  className?: string;
}

export function HealthBadge({ status, text, size = "sm", className }: HealthBadgeProps) {
  const style = HEALTH_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium whitespace-nowrap",
        size === "sm" ? "h-5 px-2 text-xs" : "h-7 px-3 text-sm",
        style.className,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden="true" />
      {text[status]}
    </span>
  );
}
