"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";

const TABS = [
  { key: "overview", path: "" },
  { key: "talent", path: "/talent" },
  { key: "companies", path: "/companies" },
  { key: "searches", path: "/searches" },
  { key: "sources", path: "/sources" },
] as const;

/** Sub-navigation for the Sourcing module. */
export function SourcingTabs() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const base = getModule("sourcing").href;

  return (
    <nav className="flex gap-1 overflow-x-auto border-b" aria-label={dict.modules.sourcing.title}>
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === "" ? pathname === base : pathname.startsWith(href);
        return (
          <Link
            key={tab.key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {dict.sourcing.tabs[tab.key]}
          </Link>
        );
      })}
    </nav>
  );
}
