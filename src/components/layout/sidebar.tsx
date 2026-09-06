"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/shared/brand-mark";
import { useI18n } from "@/lib/i18n/client";

import { SidebarNav } from "./sidebar-nav";
import { useSidebar } from "./sidebar-context";

/** Desktop sidebar. Hidden below `lg`, where the mobile drawer takes over. */
export function Sidebar() {
  const { collapsed, toggle } = useSidebar();
  const { dict } = useI18n();

  return (
    <aside
      data-collapsed={collapsed}
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground transition-[width] duration-200 ease-out lg:flex",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className={cn("flex h-14 items-center border-b px-4", collapsed && "justify-center px-0")}>
        <BrandMark compact={collapsed} />
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <SidebarNav collapsed={collapsed} />
      </div>

      <div className={cn("border-t p-3", collapsed && "flex justify-center")}>
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "sm"}
          onClick={toggle}
          aria-label={collapsed ? dict.common.expandSidebar : dict.common.collapseSidebar}
          aria-expanded={!collapsed}
          className={cn("text-muted-foreground", !collapsed && "w-full justify-start")}
        >
          {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          {!collapsed ? <span>{dict.common.collapse}</span> : null}
        </Button>
      </div>
    </aside>
  );
}
