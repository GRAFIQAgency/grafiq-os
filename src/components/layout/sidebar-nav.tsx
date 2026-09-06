"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { modules, type ModuleDefinition } from "@/config/modules";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const groups: { key: ModuleDefinition["group"]; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "modules", label: "Modules" },
  { key: "system", label: "System" },
];

interface SidebarNavProps {
  collapsed?: boolean;
  /** Called after a link is clicked (used to close the mobile drawer). */
  onNavigate?: () => void;
}

export function SidebarNav({ collapsed = false, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav aria-label="Main navigation" className="flex flex-col gap-6">
      {groups.map((group) => {
        const items = modules.filter((m) => m.group === group.key);
        if (items.length === 0) return null;

        return (
          <div key={group.key} className="flex flex-col gap-1">
            {!collapsed ? (
              <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {group.label}
              </p>
            ) : (
              <div className="mx-3 mb-1 border-t" aria-hidden="true" />
            )}
            {items.map((item) => (
              <NavItem
                key={item.id}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        );
      })}
    </nav>
  );
}

interface NavItemProps {
  item: ModuleDefinition;
  active: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavItem({ item, active, collapsed, onNavigate }: NavItemProps) {
  const Icon = item.icon;

  const link = (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group relative flex h-9 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors outline-none",
        "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
        active && "bg-sidebar-accent text-sidebar-accent-foreground",
        collapsed && "justify-center px-0"
      )}
    >
      {active ? (
        <span
          aria-hidden="true"
          className="absolute top-2 bottom-2 -left-2 w-0.5 rounded-full bg-foreground"
        />
      ) : null}
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {!collapsed ? <span className="truncate">{item.title}</span> : null}
      {!collapsed && item.status === "planned" ? (
        <span className="ml-auto size-1.5 rounded-full bg-muted-foreground/30" title="Planned" />
      ) : null}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {item.title}
      </TooltipContent>
    </Tooltip>
  );
}
