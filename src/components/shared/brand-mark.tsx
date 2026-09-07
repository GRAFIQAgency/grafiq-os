import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

import { GrafiqLogo } from "./grafiq-logo";

interface BrandMarkProps {
  /** Hide the wordmark (used when the sidebar is collapsed). */
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <Link
      href={siteConfig.defaultRoute}
      className={cn("flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50", className)}
      aria-label={siteConfig.name}
      data-guide="nav-brand"
    >
      <GrafiqLogo className="size-8 rounded-md border border-white/10" />
      {!compact ? (
        <span className="truncate text-sm font-semibold tracking-wide">{siteConfig.name}</span>
      ) : null}
    </Link>
  );
}
