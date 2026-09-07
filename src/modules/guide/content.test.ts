import { describe, expect, it } from "vitest";

import { modules } from "@/config/modules";
import cs from "@/lib/i18n/dictionaries/cs";
import en from "@/lib/i18n/dictionaries/en";

import { GUIDE_CHAPTERS, GUIDE_CHAPTER_IDS, GUIDE_STEPS, chapterForPath, nextStep } from "./content";

/**
 * Alignment guard: the guide must describe the product 1:1.
 * If this fails after a feature change, update src/modules/guide/content.ts
 * and the `guide` section of both dictionaries.
 */
describe("guide content stays aligned with the product", () => {
  it("covers every active module with at least one step", () => {
    const active = modules.filter((m) => m.status === "active").map((m) => m.id);
    for (const id of active) {
      expect(GUIDE_STEPS.some((s) => s.moduleId === id), `no guide step for active module "${id}"`).toBe(true);
    }
  });

  it("only points at routes that belong to registered modules", () => {
    for (const step of GUIDE_STEPS) {
      const owner = modules.find((m) => step.href === m.href || step.href.startsWith(`${m.href}/`));
      expect(owner, `step "${step.id}" links to unknown route ${step.href}`).toBeDefined();
      expect(owner?.status, `step "${step.id}" links to a module that is not active`).toBe("active");
    }
  });

  it("has unique step ids and known chapters", () => {
    const ids = GUIDE_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const step of GUIDE_STEPS) expect(GUIDE_CHAPTER_IDS).toContain(step.chapterId);
    for (const chapter of GUIDE_CHAPTERS) expect(GUIDE_CHAPTER_IDS).toContain(chapter.id);
  });

  it("has EN and CS texts for every chapter and step", () => {
    for (const dict of [en, cs]) {
      for (const chapter of GUIDE_CHAPTERS) {
        const text = (dict.guide.chapters as Record<string, { title: string; intro: string }>)[chapter.id];
        expect(text?.title, `missing chapter text "${chapter.id}"`).toBeTruthy();
      }
      for (const step of GUIDE_STEPS) {
        const text = (dict.guide.steps as Record<string, { title: string; body: string }>)[step.id];
        expect(text?.title && text?.body, `missing step text "${step.id}"`).toBeTruthy();
      }
    }
  });

  it("maps pages to chapters and walks steps in order", () => {
    expect(chapterForPath("/sourcing/talent/123")?.id).toBe("talent");
    expect(chapterForPath("/talent/123")?.id).toBe("bench");
    expect(chapterForPath("/projects/new")?.id).toBe("projects");
    expect(chapterForPath("/sourcing/companies")?.id).toBe("clients");
    expect(chapterForPath("/sales/123")?.id).toBe("sales");
    expect(chapterForPath("/sourcing/sources")?.id).toBe("sources");
    expect(chapterForPath("/pricing")?.id).toBe("pricing");
    expect(nextStep("start-navigate")?.id).toBe("start-dashboard");
    expect(nextStep("start-help")?.id).toBe("start-mobile");
    expect(nextStep(GUIDE_STEPS[GUIDE_STEPS.length - 1].id)).toBeUndefined();
  });
});
