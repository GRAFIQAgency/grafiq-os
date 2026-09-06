import Link from "next/link";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";

interface PaginationProps {
  basePath: string;
  params: URLSearchParams;
  page: number;
  pageSize: number;
  total: number;
}

export async function Pagination({ basePath, params, page, pageSize, total }: PaginationProps) {
  const dict = await getDictionary();
  const t = dict.sourcing.search;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const link = (p: number) => {
    const next = new URLSearchParams(params);
    next.set("page", String(p));
    return `${basePath}?${next.toString()}`;
  };
  const btn = (disabled: boolean) => cn(buttonVariants({ variant: "outline", size: "sm" }), disabled && "pointer-events-none opacity-50");

  return (
    <div className="flex items-center justify-between gap-3 text-sm text-muted-foreground">
      <span>{interpolate(t.results, { total })}</span>
      <div className="flex items-center gap-2">
        <span>{interpolate(t.page, { page, pages })}</span>
        <Link href={link(page - 1)} className={btn(page <= 1)} aria-disabled={page <= 1}>{t.prev}</Link>
        <Link href={link(page + 1)} className={btn(page >= pages)} aria-disabled={page >= pages}>{t.next}</Link>
      </div>
    </div>
  );
}
