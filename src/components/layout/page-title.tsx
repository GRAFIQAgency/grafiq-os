"use client";

import { usePathname } from "next/navigation";

import { getModuleByPathname } from "@/config/modules";
import { siteConfig } from "@/config/site";

/** Top-bar title derived from the current route via the module registry. */
export function PageTitle() {
  const pathname = usePathname();
  const mod = getModuleByPathname(pathname);
  return (
    <h2 className="truncate text-sm font-medium">{mod?.title ?? siteConfig.name}</h2>
  );
}
