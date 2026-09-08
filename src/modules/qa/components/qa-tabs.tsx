import Link from "next/link";

import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export type QaTab = "projects" | "templates";

export function QaTabs({ current, dict }: { current: QaTab; dict: Dictionary }) {
  const base = getModule("qa").href;
  return (
    <nav className="flex gap-1 border-b" data-guide="qa-tabs">
      {(["projects", "templates"] as const).map((tab) => (
        <Link
          key={tab}
          href={tab === "projects" ? base : `${base}?tab=templates`}
          aria-current={current === tab ? "page" : undefined}
          className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", current === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {dict.qa.tabs[tab]}
        </Link>
      ))}
    </nav>
  );
}
