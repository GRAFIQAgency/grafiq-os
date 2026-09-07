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

export const GUIDE_CHAPTER_IDS = ["start", "setup", "pricing", "talent", "clients", "sources", "next"] as const;
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
  { id: "setup", moduleId: "settings", pathPrefix: "/settings" },
  { id: "pricing", moduleId: "pricing", pathPrefix: "/pricing" },
  { id: "talent", moduleId: "sourcing", pathPrefix: "/sourcing/talent" },
  { id: "clients", moduleId: "sourcing", pathPrefix: "/sourcing/companies" },
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

  // 2. Set up business defaults (do this once)
  { id: "setup-company", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-company" },
  { id: "setup-economics", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-economics" },
  { id: "setup-terms", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-terms" },
  { id: "setup-roles", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-roles" },
  { id: "setup-save", chapterId: "setup", moduleId: "settings", href: "/settings", anchor: "settings-save" },

  // 3. Price a project
  { id: "pricing-info", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-project" },
  { id: "pricing-costs", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-costs" },
  { id: "pricing-summary", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-summary" },
  { id: "pricing-save", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-save" },
  { id: "pricing-history", chapterId: "pricing", moduleId: "pricing", href: "/pricing", anchor: "pricing-recent" },

  // 4. Find talent
  { id: "talent-filters", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-filters" },
  { id: "talent-search", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-search" },
  { id: "talent-review", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-review" },
  { id: "talent-detail", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-review" },
  { id: "talent-add", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/talent", anchor: "sourcing-add-talent" },
  { id: "talent-clipper", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-table" },
  { id: "talent-apply", chapterId: "talent", moduleId: "sourcing", href: "/sourcing/sources", anchor: "sources-table" },

  // 5. Find clients
  { id: "clients-search", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-search" },
  { id: "clients-signals", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-review" },
  { id: "clients-crm", chapterId: "clients", moduleId: "sourcing", href: "/sourcing/companies", anchor: "sourcing-review" },

  // 6. Sources and saved searches
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

/** Chapter shown in the contextual help panel for a pathname (longest prefix wins). */
export function chapterForPath(pathname: string): GuideChapter | undefined {
  return [...GUIDE_CHAPTERS]
    .filter((c) => pathname === c.pathPrefix || pathname.startsWith(`${c.pathPrefix}/`))
    .sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];
}

/** Modules that exist in the registry but are not built yet — listed in the "What's next" chapter. */
export function plannedModules() {
  return modules.filter((m) => m.status === "planned");
}

/** Link that opens a page with the tour focused on a step. */
export function stepHref(step: GuideStep): string {
  return `${step.href}?guide=${step.id}`;
}
