"use client";

import { usePathname } from "next/navigation";

import { getModuleByPathname } from "@/config/modules";
import { siteConfig } from "@/config/site";
import { useI18n } from "@/lib/i18n/client";

/** Top-bar title derived from the current route via the module registry. */
export function PageTitle() {
  const pathname = usePathname();
  const { dict } = useI18n();
  const mod = getModuleByPathname(pathname);
  return (
    <h2 className="truncate text-sm font-medium">{mod ? dict.modules[mod.id].title : siteConfig.name}</h2>
  );
}
