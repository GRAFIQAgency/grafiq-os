import Link from "next/link";

import { StatusBadge } from "@/components/shared/status-badge";
import { getModule } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import type { QaTemplateSummary } from "../types";
import { NewTemplateButton } from "./new-template-button";

export function TemplatesList({ templates, dict }: { templates: QaTemplateSummary[]; dict: Dictionary }) {
  const t = dict.qa.templates;
  const types = dict.projects.types as Record<string, string>;
  const base = `${getModule("qa").href}/templates`;
  return (
    <div className="space-y-4" data-guide="qa-templates">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">{t.description}</p>
        <NewTemplateButton />
      </div>
      {templates.length === 0 ? <p className="rounded-lg border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">{t.empty}</p> : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2 [&>th]:text-left [&>th]:font-medium">
                <th>{t.columns.template}</th><th>{t.columns.type}</th><th className="text-right!">{t.columns.items}</th><th className="text-right!">{t.columns.required}</th><th className="text-right!">{t.columns.usedBy}</th><th>{t.columns.status}</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((tp) => (
                <tr key={tp.id} className={cn("relative border-t transition-colors hover:bg-muted/30", !tp.isActive && "opacity-60")}>
                  <td className="px-3 py-2.5">
                    <Link href={`${base}/${tp.id}`} className="font-medium hover:underline after:absolute after:inset-0">{tp.name}</Link>
                    {tp.description ? <p className="line-clamp-1 text-xs text-muted-foreground">{tp.description}</p> : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs">{tp.projectType ? types[tp.projectType] ?? tp.projectType : "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tp.itemCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tp.requiredCount}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{tp.usedByProjects}</td>
                  <td className="px-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                      <StatusBadge status={tp.isActive ? "approved" : "archived"} label={tp.isActive ? t.active : t.archived} />
                      {tp.seedKey ? <span className="text-[11px] text-muted-foreground">{t.seeded}</span> : null}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
