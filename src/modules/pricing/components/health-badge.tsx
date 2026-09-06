import { cn } from "@/lib/utils";

import type { HealthStatus } from "../types";

const HEALTH_STYLES: Record<HealthStatus, { label: string; className: string; dot: string }> = {
  healthy: {
    label: "Healthy",
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    dot: "bg-emerald-400",
  },
  warning: {
    label: "Warning",
    className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    dot: "bg-amber-400",
  },
  bad: {
    label: "Bad deal",
    className: "border-red-500/30 bg-red-500/10 text-red-400",
    dot: "bg-red-400",
  },
};

export const HEALTH_DESCRIPTIONS: Record<HealthStatus, string> = {
  healthy: "Margin meets the target. Safe to sell.",
  warning: "Margin is below target. Review scope or price before selling.",
  bad: "Margin is too low. Founder approval required.",
};

interface HealthBadgeProps {
  status: HealthStatus;
  size?: "sm" | "md";
  className?: string;
}

export function HealthBadge({ status, size = "sm", className }: HealthBadgeProps) {
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
      {style.label}
    </span>
  );
}
