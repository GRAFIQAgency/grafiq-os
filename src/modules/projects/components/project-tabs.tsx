"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/client";

const TABS = ["overview", "work", "team", "financials", "activity"] as const;
export type ProjectTab = (typeof TABS)[number];

export function ProjectTabs({ href, counts }: { href: string; counts: Partial<Record<ProjectTab, number>> }) {
  const { dict } = useI18n();
  const current = (useSearchParams().get("tab") as ProjectTab) || "overview";
  return (
    <nav className="flex gap-1 overflow-x-auto border-b" data-guide="projects-tabs">
      {TABS.map((tab) => (
        <Link
          key={tab}
          href={tab === "overview" ? href : `${href}?tab=${tab}`}
          aria-current={current === tab ? "page" : undefined}
          className={cn("-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            current === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}
        >
          {dict.projects.tabs[tab]}
          {counts[tab] ? <span className="rounded bg-muted px-1.5 text-[11px] text-muted-foreground">{counts[tab]}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
