import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getModule } from "@/config/modules";
import { formatDate, formatMoney, formatPercent } from "@/lib/format";
import type { Dictionary, Locale } from "@/lib/i18n/config";

import type { ProjectListItem } from "../types";
import { HealthBadge, PriorityBadge, ProgressBar, ProjectStatusBadge } from "./badges";

export function ProjectsTable({ items, dict, locale, filtered }: { items: ProjectListItem[]; dict: Dictionary; locale: Locale; filtered: boolean }) {
  const t = dict.projects.list;
  const base = getModule("projects").href;
  const types = dict.projects.types as Record<string, string>;

  if (!items.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-16 text-center" data-guide="projects-list">
        <p className="text-sm font-medium">{filtered ? t.noMatch : t.empty}</p>
        {!filtered ? (
          <>
            <p className="max-w-sm text-sm text-muted-foreground">{t.emptyHint}</p>
            <Link href={`${base}/new`} className={buttonVariants({ size: "sm" })}>{dict.projects.newProject}</Link>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border" data-guide="projects-list">
      <table className="w-full min-w-[1080px] text-sm">
        <thead className="bg-muted/30 text-xs text-muted-foreground">
          <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
            <th>{t.columns.name}</th><th>{t.columns.status}</th><th>{t.columns.owner}</th><th>{t.columns.deadline}</th>
            <th className="w-36">{t.columns.progress}</th><th className="text-right!">{t.columns.revenue}</th><th className="text-right!">{t.columns.margin}</th>
            <th>{t.columns.health}</th><th>{t.columns.priority}</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const p = i.project;
            const overdue = p.deadline && p.deadline < new Date().toISOString().slice(0, 10) && !["completed", "cancelled", "archived"].includes(p.status);
            return (
              <tr key={p.id} className={cn("relative border-t transition-colors hover:bg-muted/30", p.status === "archived" && "opacity-60")}>
                <td className="px-3 py-2.5">
                  <Link href={`${base}/${p.id}`} className="font-medium hover:underline after:absolute after:inset-0">{p.name}</Link>
                  <p className="text-xs text-muted-foreground">{[p.clientName, types[p.projectType] ?? p.projectType].filter(Boolean).join(" · ")}</p>
                </td>
                <td className="px-3 py-2.5"><ProjectStatusBadge status={p.status} dict={dict} /></td>
                <td className="px-3 py-2.5 text-xs">{p.ownerName ?? "—"}</td>
                <td className={cn("px-3 py-2.5 text-xs tabular-nums", overdue && "text-red-400")}>{formatDate(p.deadline, locale)}</td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <ProgressBar percent={i.progress.percent} className="flex-1" />
                    <span className="w-8 text-right text-xs tabular-nums">{i.progress.percent} %</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(i.financials.current.revenue, p.currency, locale)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">
                  <span className="text-muted-foreground">{formatPercent(i.financials.baseline.grossMargin, locale, 0)}</span>
                  <span className="text-muted-foreground"> → </span>
                  <span className="font-medium">{formatPercent(i.financials.forecast.grossMargin, locale, 0)}</span>
                </td>
                <td className="px-3 py-2.5"><HealthBadge health={i.health.status} dict={dict} /></td>
                <td className="px-3 py-2.5"><PriorityBadge priority={p.priority} dict={dict} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
