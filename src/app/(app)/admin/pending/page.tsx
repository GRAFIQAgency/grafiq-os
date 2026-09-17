import Link from "next/link";

import { PageHeader } from "@/components/shared/page-header";
import { getModule } from "@/config/modules";
import { moduleMetadata } from "@/lib/i18n/metadata";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";
import { PendingActions } from "@/modules/hermes/components/pending-actions";
import { listPendingActions } from "@/modules/hermes/queries";
import { cn } from "@/lib/utils";

export const generateMetadata = moduleMetadata("approvals");

export default async function PendingApprovalsPage({ searchParams }: PageProps<"/admin/pending">) {
  const params = await searchParams;
  const tab = params.tab === "decided" ? "decided" : "pending";
  const [dict, items] = await Promise.all([
    getDictionary(),
    listPendingActions(tab === "decided" ? "all" : "pending"),
  ]);
  const t = dict.approvals;
  const base = getModule("approvals").href;
  const visible = tab === "decided" ? items.filter((i) => i.row.status !== "pending") : items;
  const waiting = items.filter((i) => i.row.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader title={t.title} description={interpolate(t.count, { n: waiting })} />
      <p className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground" data-guide="pending-intro">{t.intro}</p>
      <nav className="flex gap-1 border-b" data-guide="pending-tabs">
        {(["pending", "decided"] as const).map((key) => (
          <Link key={key} href={key === "pending" ? base : `${base}?tab=decided`} aria-current={tab === key ? "page" : undefined}
            className={cn("-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors", tab === key ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {t.tabs[key]}
          </Link>
        ))}
      </nav>
      <PendingActions items={visible} decided={tab === "decided"} />
    </div>
  );
}
