import { modules, type ModuleId } from "@/config/modules";

/**
 * The interactive guide — the single description of how GRAFIQ OS is meant to
 * be used, in work-process order. Texts live in the i18n dictionaries under
 * `guide.chapters.<id>` and `guide.steps.<id>`.
 *
 * KEEP THIS 1:1 WITH THE PRODUCT. Every feature change must update the steps
 * here (and the dictionaries); `content.test.ts` enforces that every active
 * module is covered and that every step points at a real route.
 *
 * `anchor` matches a `data-guide="<anchor>"` attribute on the target page, so
 * the tour can spotlight the real control.
 */

export const GUIDE_CHAPTER_IDS = ["start", "dashboard", "setup", "pricing", "talent", "bench", "projects", "capacity", "qa", "finance", "clients", "sales", "sources", "next"] as const;
export type GuideChapterId = (typeof GUIDE_CHAPTER_IDS)[number];

export interface GuideChapter {
  id: GuideChapterId;
  /** Module the chapter mostly lives in (for the contextual help panel). */
  moduleId: ModuleId;
  /** Route prefix used to show this chapter as "you are here". */
  pathPrefix: string;
}

export interface GuideStep {
  id: string;
  chapterId: GuideChapterId;
  moduleId: ModuleId;
  /** Where "Go there" takes the user. */
  href: string;
  /** Optional `data-guide` anchor to spotlight on that page. */
  anchor?: string;
}

export const GUIDE_CHAPTERS: readonly GuideChapter[] = [
  { id: "start", moduleId: "dashboard", pathPrefix: "/dashboard" },
  { id: "dashboard", moduleId: "dashboard", pathPrefix: "/dashboard" },
  { id: "setup", moduleId: "settings", pathPrefix: "/settings" },
  { id: "pricing", moduleId: "pricing", pathPrefix: "/pricing" },
  { id: "talent", moduleId: "sourcing", pathPrefix: "/sourcing/talent" },
  { id: "bench", moduleId: "talent", pathPrefix: "/talent" },
  { id: "projects", moduleId: "projects", pathPrefix: "/projects" },
  { id: "capacity", moduleId: "capacity", pathPrefix: "/capacity" },
  { id: "qa", moduleId: "qa", pathPrefix: "/qa" },
  { id: "finance", moduleId: "finance", pathPrefix: "/finance" },
  { id: "clients", moduleId: "sourcing", pathPrefix: "/sourcing/companies" },
  { id: "sales", moduleId: "sales", pathPrefix: "/sales" },
  { id: "sources", moduleId: "sourcing", pathPrefix: "/sourcing" },
  { id: "next", moduleId: "guide", pathPrefix: "/guide" },
];

export const GUIDE_STEPS: readonly GuideStep[] = [
  // 1. Getting around
  { id: "start-navigate", chapterId: "start", moduleId: "dashboard", href: "/dashboard", anchor: "nav-sidebar" },
  { id: "start-dashboard", chapterId: "start", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-stats" },
  { id: "start-language", chapterId: "start", moduleId: "dashboard", href: "/dashboard", anchor: "language-switcher" },
  { id: "start-help", chapterId: "start", moduleId: "guide", href: "/dashboard", anchor: "guide-help" },
  { id: "start-mobile", chapterId: "start", moduleId: "dashboard", href: "/dashboard", anchor: "nav-brand" },

  // 2. Read the dashboard every morning
  { id: "dashboard-what", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-attention" },
  { id: "dashboard-pulse", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-stats" },
  { id: "dashboard-health", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-health" },
  { id: "dashboard-attention", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-attention" },
  { id: "dashboard-timeline", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-timeline" },
  { id: "dashboard-delivery", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-projects" },
  { id: "dashboard-finance", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-finance" },
  { id: "dashboard-capacity", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-capacity" },
  { id: "dashboard-sales", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-sales" },
  { id: "dashboard-actions", chapterId: "dashboard", moduleId: "dashboard", href: "/dashboard", anchor: "dashboard-quick-actions" },

  // 3. Set up business defaults (do this once)
  { id: "setup-company", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-company" },
  { id: "setup-economics", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-economics" },
  { id: "setup-terms", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-terms" },
  { id: "setup-roles", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-roles" },
  { id: "setup-people", chapterId: "setup", moduleId: "talent", href: "/settings", anchor: "settings-people" },
  { id: "setup-save", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-save" },

  // 4. Price a project
  { id: "pricing-info", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-project" },
  { id: "pricing-costs", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-costs" },
  { id: "pricing-summary", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-summary" },
  { id: "pricing-save", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-save" },
  { id: "pricing-history", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-recent" },
  { id: "pricing-proposal", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-proposal" },
  { id: "pricing-share", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-proposal" },

  // 5. Find talent
  { id: "talent-filters", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-filters" },
  { id: "talent-search", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-search" },
  { id: "talent-review", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-review" },
  { id: "talent-detail", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-review" },
  { id: "talent-add", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-add-talent" },
  { id: "talent-clipper", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-table" },
  { id: "talent-apply", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-table" },

  // 6. Staff from the Talent Bench
  { id: "bench-list", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-list" },
  { id: "bench-filters", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-filters" },
  { id: "bench-availability", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-list" },
  { id: "bench-commercial", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-list" },
  { id: "bench-archive", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-list" },
  { id: "bench-add", chapterId: "bench", moduleId: "talent", href: "/talent", anchor: "talent-add-person" },

  // 7. Deliver a project
  { id: "projects-list", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "projects-create", chapterId: "projects", moduleId: "projects", href: "/projects/new", anchor: "projects-source" },
  { id: "projects-client", chapterId: "projects", moduleId: "projects", href: "/projects/new", anchor: "projects-client" },
  { id: "projects-baseline", chapterId: "projects", moduleId: "projects", href: "/projects/new", anchor: "projects-baseline" },
  { id: "projects-team", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "projects-work", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "projects-financials", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "projects-changes", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "projects-health", chapterId: "projects", moduleId: "projects", href: "/projects", anchor: "projects-list" },

  // 8. Plan capacity
  { id: "capacity-plan", chapterId: "capacity", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "capacity-overview", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-summary" },
  { id: "capacity-period", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-period" },
  { id: "capacity-people", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-people" },
  { id: "capacity-person", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-people" },
  { id: "capacity-resolve", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-people" },
  { id: "capacity-internal", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-people" },
  { id: "capacity-projects", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-view" },
  { id: "capacity-matrix", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-matrix" },
  { id: "capacity-whatif", chapterId: "capacity", moduleId: "capacity", href: "/capacity", anchor: "capacity-whatif" },

  // 9. Control delivery quality
  { id: "qa-start", chapterId: "qa", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "qa-checklist", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-list" },
  { id: "qa-fail", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-list" },
  { id: "qa-approve", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-list" },
  { id: "qa-complete", chapterId: "qa", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "qa-sampling", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-list" },
  { id: "qa-overview", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-stats" },
  { id: "qa-filters", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-filters" },
  { id: "qa-templates", chapterId: "qa", moduleId: "qa", href: "/qa", anchor: "qa-tabs" },

  // 10. Manage money (profit ≠ cash)
  { id: "finance-concept", chapterId: "finance", moduleId: "finance", href: "/finance", anchor: "finance-concept" },
  { id: "finance-accounts", chapterId: "finance", moduleId: "finance", href: "/finance/cashflow", anchor: "finance-accounts" },
  { id: "finance-schedule", chapterId: "finance", moduleId: "projects", href: "/projects", anchor: "projects-list" },
  { id: "finance-receivables", chapterId: "finance", moduleId: "finance", href: "/finance/receivables", anchor: "finance-receivables" },
  { id: "finance-record-payment", chapterId: "finance", moduleId: "finance", href: "/finance/receivables", anchor: "finance-receivables" },
  { id: "finance-payables", chapterId: "finance", moduleId: "finance", href: "/finance/payables", anchor: "finance-add-payable" },
  { id: "finance-pay", chapterId: "finance", moduleId: "finance", href: "/finance/payables", anchor: "finance-payables" },
  { id: "finance-recurring", chapterId: "finance", moduleId: "finance", href: "/finance/costs", anchor: "finance-recurring" },
  { id: "finance-forecast", chapterId: "finance", moduleId: "finance", href: "/finance/cashflow", anchor: "finance-forecast" },
  { id: "finance-profitability", chapterId: "finance", moduleId: "finance", href: "/finance/profitability", anchor: "finance-profitability" },
  { id: "finance-risks", chapterId: "finance", moduleId: "finance", href: "/finance", anchor: "finance-risks" },

  // 11. Find clients
  { id: "clients-search", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-search" },
  { id: "clients-signals", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-review" },
  { id: "clients-crm", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-review" },

  // 12. Win the deal
  { id: "sales-list", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-board", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-view" },
  { id: "sales-stage", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-deal", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-estimate", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-contacts", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-won", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-list" },
  { id: "sales-add", chapterId: "sales", moduleId: "sales", href: "/sales", anchor: "sales-add-company" },

  // 13. Sources and saved searches
  { id: "sources-manage", chapterId: "sources", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-table" },
  { id: "sources-csv", chapterId: "sources", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-csv" },
  { id: "sources-saved", chapterId: "sources", moduleId: "sourcing", href: "/sourcing/searches", anchor: "searches-table" },
  { id: "sources-overview", chapterId: "sources", moduleId: "sourcing", href: "/sourcing", anchor: "sourcing-overview" },
];

export function findStep(id: string | null | undefined): GuideStep | undefined {
  return id ? GUIDE_STEPS.find((s) => s.id === id) : undefined;
}

export function stepsForChapter(chapterId: GuideChapterId): GuideStep[] {
  return GUIDE_STEPS.filter((s) => s.chapterId === chapterId);
}

export function nextStep(id: string): GuideStep | undefined {
  const i = GUIDE_STEPS.findIndex((s) => s.id === id);
  return i >= 0 ? GUIDE_STEPS[i + 1] : undefined;
}

export function previousStep(id: string): GuideStep | undefined {
  const i = GUIDE_STEPS.findIndex((s) => s.id === id);
  return i > 0 ? GUIDE_STEPS[i - 1] : undefined;
}

/**
 * Chapter shown in the contextual help panel for a pathname: the longest
 * matching prefix wins and, when two chapters share a prefix, the later one
 * (the specific chapter added after a general one, e.g. "dashboard" after
 * "start" on /dashboard).
 */
export function chapterForPath(pathname: string): GuideChapter | undefined {
  return [...GUIDE_CHAPTERS]
    .filter((c) => pathname === c.pathPrefix || pathname.startsWith(`${c.pathPrefix}/`))
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length || GUIDE_CHAPTERS.indexOf(b) - GUIDE_CHAPTERS.indexOf(a))[0];
}

/** Modules that exist in the registry but are not built yet — listed in the "What's next" chapter. */
export function plannedModules() {
  return modules.filter((m) => m.status === "planned");
}

/** Link that opens a page with the tour focused on a step. */
export function stepHref(step: GuideStep): string {
  return `${step.href}?guide=${step.id}`;
}
