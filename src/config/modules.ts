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
  /** Label shown in navigation and as the page title. */
  title: string;
  /** Route prefix. Sub-routes of a module live under this path. */
  href: `/${string}`;
  icon: LucideIcon;
  /** One-line description used on placeholder pages. */
  description: string;
  status: ModuleStatus;
  /** Sidebar grouping. */
  group: "overview" | "modules" | "system";
}

export const modules: readonly ModuleDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    description: "Agency-wide overview of projects, pipeline, revenue and capacity.",
    status: "active",
    group: "overview",
  },
  {
    id: "projects",
    title: "Projects",
    href: "/projects",
    icon: FolderKanban,
    description: "Client projects, scope, timelines and delivery status.",
    status: "planned",
    group: "modules",
  },
  {
    id: "pricing",
    title: "Pricing",
    href: "/pricing",
    icon: Calculator,
    description: "Pricing and profit calculator for quotes and proposals.",
    status: "active",
    group: "modules",
  },
  {
    id: "capacity",
    title: "Capacity",
    href: "/capacity",
    icon: CalendarRange,
    description: "Team capacity planning and workload allocation.",
    status: "planned",
    group: "modules",
  },
  {
    id: "talent",
    title: "Talent",
    href: "/talent",
    icon: Users,
    description: "Freelancer bench, skills, rates and availability.",
    status: "planned",
    group: "modules",
  },
  {
    id: "sales",
    title: "Sales",
    href: "/sales",
    icon: BarChart3,
    description: "Leads, proposals and the sales pipeline.",
    status: "planned",
    group: "modules",
  },
  {
    id: "finance",
    title: "Finance",
    href: "/finance",
    icon: Landmark,
    description: "Invoices, costs, margins and cash flow.",
    status: "planned",
    group: "modules",
  },
  {
    id: "qa",
    title: "QA",
    href: "/qa",
    icon: ShieldCheck,
    description: "Quality assurance checklists and review workflows.",
    status: "planned",
    group: "modules",
  },
  {
    id: "settings",
    title: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Workspace, users and application preferences.",
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
