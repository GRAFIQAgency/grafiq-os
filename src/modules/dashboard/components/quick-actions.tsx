import Link from "next/link";
import { Calculator, FolderPlus, Handshake, Landmark, ShieldCheck, UserSearch } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { modules } from "@/config/modules";
import type { Dictionary } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

import { QUICK_ACTIONS } from "../constants";

const ICONS = { estimate: Calculator, project: FolderPlus, prospect: Handshake, talent: UserSearch, receivable: Landmark, qa: ShieldCheck } as const;

/** Links into flows that really exist. Actions of inactive modules are dropped. */
export function QuickActions({ dict }: { dict: Dictionary }) {
  const t = dict.dashboard.quickActions;
  const available = QUICK_ACTIONS.filter((a) => modules.find((m) => m.id === a.moduleId)?.status === "active");
  return (
    <div className="rounded-lg border bg-card p-4" data-guide="dashboard-quick-actions">
      <p className="mb-3 text-sm font-medium">{t.title}</p>
      <div className="flex flex-wrap gap-2">
        {available.map((a) => {
          const Icon = ICONS[a.id as keyof typeof ICONS];
          return (
            <Link key={a.id} href={a.href} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
              <Icon data-icon="inline-start" />
              {(t as Record<string, string>)[a.id]}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
