import Link from "next/link";

import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

interface BrandMarkProps {
  /** Hide the wordmark (used when the sidebar is collapsed). */
  compact?: boolean;
  className?: string;
}

export function BrandMark({ compact = false, className }: BrandMarkProps) {
  return (
    <Link
      href={siteConfig.defaultRoute}
      className={cn("flex items-center gap-2.5 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-md", className)}
      aria-label={siteConfig.name}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground text-sm font-bold tracking-tight text-background">
        {siteConfig.shortName}
      </span>
      {!compact ? (
        <span className="truncate text-sm font-semibold tracking-wide">{siteConfig.name}</span>
      ) : null}
    </Link>
  );
}
