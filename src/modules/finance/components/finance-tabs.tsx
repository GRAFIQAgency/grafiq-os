"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { getModule } from "@/config/modules";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export const FINANCE_TABS = ["overview", "cashflow", "receivables", "payables", "costs", "profitability"] as const;
export type FinanceTab = (typeof FINANCE_TABS)[number];

export function financeTabHref(tab: FinanceTab): string {
  const base = getModule("finance").href;
  return tab === "overview" ? base : `${base}/${tab}`;
}

export function FinanceTabs() {
  const { dict } = useI18n();
  const pathname = usePathname();
  const current = FINANCE_TABS.find((t) => t !== "overview" && pathname.startsWith(financeTabHref(t))) ?? "overview";
  return (
    <nav className="flex gap-1 overflow-x-auto border-b" data-guide="finance-tabs">
      {FINANCE_TABS.map((tab) => (
        <Link key={tab} href={financeTabHref(tab)} aria-current={current === tab ? "page" : undefined}
          className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", current === tab ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
          {dict.finance.tabs[tab]}
        </Link>
      ))}
    </nav>
  );
}
