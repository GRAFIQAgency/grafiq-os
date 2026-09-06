import {
  BarChart3,
  Calculator,
  CalendarRange,
  FolderKanban,
  Landmark,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Module registry — the single source of truth for the app's modules.
 *
 * Sidebar navigation, page titles and placeholder pages are all derived
 * from this list. When a new module is added to `src/modules/`, register
 * it here and it appears in the navigation automatically.
 *
 * Titles and descriptions are translated: see `modules.<id>` in
 * `src/lib/i18n/dictionaries/*.ts`.
 */

export type ModuleId =
  | "dashboard"
  | "projects"
  | "pricing"
  | "capacity"
  | "talent"
  | "sales"
  | "finance"
  | "qa"
  | "settings";

export type ModuleStatus = "active" | "planned";

export interface ModuleDefinition {
  id: ModuleId;
  /** Route prefix. Sub-routes of a module live under this path. */
  href: `/${string}`;
  icon: LucideIcon;
  status: ModuleStatus;
  /** Sidebar grouping. */
  group: "overview" | "modules" | "system";
}

export const modules: readonly ModuleDefinition[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    status: "active",
    group: "overview",
  },
  {
    id: "projects",
    href: "/projects",
    icon: FolderKanban,
    status: "planned",
    group: "modules",
  },
  {
    id: "pricing",
    href: "/pricing",
    icon: Calculator,
    status: "active",
    group: "modules",
  },
  {
    id: "capacity",
    href: "/capacity",
    icon: CalendarRange,
    status: "planned",
    group: "modules",
  },
  {
    id: "talent",
    href: "/talent",
    icon: Users,
    status: "planned",
    group: "modules",
  },
  {
    id: "sales",
    href: "/sales",
    icon: BarChart3,
    status: "planned",
    group: "modules",
  },
  {
    id: "finance",
    href: "/finance",
    icon: Landmark,
    status: "planned",
    group: "modules",
  },
  {
    id: "qa",
    href: "/qa",
    icon: ShieldCheck,
    status: "planned",
    group: "modules",
  },
  {
    id: "settings",
    href: "/settings",
    icon: Settings,
    status: "planned",
    group: "system",
  },
];

export function getModule(id: ModuleId): ModuleDefinition {
  const found = modules.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown module: ${id}`);
  return found;
}

/** Finds the module that owns a pathname (e.g. "/projects/123" → projects). */
export function getModuleByPathname(pathname: string): ModuleDefinition | undefined {
  return modules.find((m) => pathname === m.href || pathname.startsWith(`${m.href}/`));
}
