import { describe, expect, it } from "vitest";

import type { QaChecklistOverview, QaItemState, QaTemplateItem } from "../types";
import { validateChecklist, validateItemUpdate } from "../validation";
import { approvalCheck, approve, deriveStatus, groupByCategory, isOverdue, isValidStatusFor, nextChecklistState, nextUnresolved, progressOf } from "./checklist";
import { completionGate } from "./gate";
import { recommendTemplate } from "./recommend";
import { fixTaskTitle, snapshotItems } from "./snapshot";
import { attentionGroupOf, attentionItems, matchesFilters, qaStats, sortOverview, summarizeProject } from "./stats";

const item = (status: QaItemState["status"], over: Partial<QaItemState> = {}): QaItemState => ({ status, isRequired: true, allowNa: false, ...over });

describe("template snapshot", () => {
  const templateItems: QaTemplateItem[] = [
    { id: "t2", templateId: "T", category: "Responsive", title: "Mobile", description: null, isRequired: true, allowNa: false, position: 1 },
    { id: "t1", templateId: "T", category: "Responsive", title: "Desktop", description: "Check at 1440", isRequired: true, allowNa: false, position: 0 },
    { id: "t3", templateId: "T", category: "SEO", title: "Sitemap", description: null, isRequired: false, allowNa: true, position: 2 },
  ];

  it("copies template items in order as plain values", () => {
    const snap = snapshotItems(templateItems);
    expect(snap.map((s) => s.title)).toEqual(["Desktop", "Mobile", "Sitemap"]);
    expect(snap[0]).toEqual({ templateItemId: "t1", category: "Responsive", title: "Desktop", description: "Check at 1440", isRequired: true, allowNa: false, position: 0 });
    expect(snap[2]).toMatchObject({ isRequired: false, allowNa: true, position: 2 });
  });

  it("editing the template afterwards does not change the snapshot", () => {
    const snap = snapshotItems(templateItems);
    templateItems[1].title = "Desktop (renamed)";
    templateItems[1].isRequired = false;
    templateItems.push({ id: "t4", templateId: "T", category: "New", title: "Added later", description: null, isRequired: true, allowNa: false, position: 3 });
    expect(snap).toHaveLength(3);
    expect(snap[0].title).toBe("Desktop");
    expect(snap[0].isRequired).toBe(true);
    // a checklist created NOW gets the newest version
    expect(snapshotItems(templateItems)).toHaveLength(4);
  });

  it("builds a fix task title", () => {
    expect(fixTaskTitle("QA", "Contact form does not submit")).toBe("QA: Contact form does not submit");
  });
});

describe("item rules", () => {
  it("allows N/A only when the frozen item allows it", () => {
    expect(isValidStatusFor({ allowNa: false }, "na")).toBe(false);
    expect(isValidStatusFor({ allowNa: true }, "na")).toBe(true);
    expect(isValidStatusFor({ allowNa: false }, "pass")).toBe(true);
    const msg = { nameRequired: "", titleRequired: "", categoryRequired: "", invalidDate: "", invalidNumber: "", invalidUrl: "url", naNotAllowed: "na", sampleExceedsDelivery: "", tooLong: "" };
    expect(validateItemUpdate({ status: "na" }, { allowNa: false }, msg).errors?.fieldErrors).toEqual({ status: "na" });
    expect(validateItemUpdate({ status: "na" }, { allowNa: true }, msg).data?.status).toBe("na");
    expect(validateItemUpdate({ status: "fail", evidenceUrl: "figma.com/x" }, { allowNa: false }, msg).errors?.fieldErrors).toEqual({ evidenceUrl: "url" });
  });

  it("computes progress", () => {
    const p = progressOf([item("pass"), item("fail"), item("pending"), item("na", { allowNa: true, isRequired: false }), item("blocked")]);
    expect(p).toMatchObject({ total: 5, resolved: 4, passed: 1, failed: 1, blocked: 1, na: 1, pending: 1, requiredTotal: 4, requiredResolved: 3, percent: 80 });
  });
});

describe("approval and status", () => {
  it("required pending item prevents approval", () => {
    expect(approvalCheck([item("pass"), item("pending")]).eligible).toBe(false);
    expect(approvalCheck([item("pass"), item("pending")]).reasons).toContain("required_pending");
  });

  it("required fail and any blocked item prevent approval", () => {
    expect(approvalCheck([item("pass"), item("fail")]).reasons).toEqual(expect.arrayContaining(["has_failed", "required_failed"]));
    expect(approvalCheck([item("pass"), item("blocked", { isRequired: false })]).reasons).toEqual(["has_blocked"]);
  });

  it("optional pending items do not block; N/A counts only where allowed", () => {
    expect(approvalCheck([item("pass"), item("pending", { isRequired: false })]).eligible).toBe(true);
    expect(approvalCheck([item("na", { allowNa: true })]).eligible).toBe(true);
    expect(approvalCheck([item("na", { allowNa: false })]).eligible).toBe(false);
    expect(approvalCheck([]).eligible).toBe(false);
  });

  it("derives the checklist status from the items", () => {
    expect(deriveStatus([item("pending"), item("pending")])).toBe("not_started");
    expect(deriveStatus([item("pass"), item("pending")])).toBe("in_progress");
    expect(deriveStatus([item("pass"), item("fail")])).toBe("needs_fixes");
    expect(deriveStatus([item("pass"), item("blocked", { isRequired: false })])).toBe("needs_fixes");
    expect(deriveStatus([item("pass"), item("pass"), item("pending", { isRequired: false })])).toBe("ready_for_review");
  });

  it("all required pass → ready for review; explicit approval stores who and when", () => {
    const items = [item("pass"), item("na", { allowNa: true })];
    expect(deriveStatus(items)).toBe("ready_for_review");
    expect(approve(items, "u1", "2026-09-08T10:00:00Z")).toEqual({ status: "approved", approvedAt: "2026-09-08T10:00:00Z", approvedBy: "u1" });
    expect(approve([item("pending")], "u1", "2026-09-08T10:00:00Z")).toBeNull();
  });

  it("changing an approved required item invalidates the approval", () => {
    const approved = { status: "approved" as const, approvedAt: "2026-09-08T10:00:00Z", approvedBy: "u1" };
    expect(nextChecklistState([item("pass"), item("pass")], approved)).toMatchObject({ status: "approved", approvedBy: "u1", approvalRevoked: false });
    expect(nextChecklistState([item("pass"), item("fail")], approved)).toEqual({ status: "needs_fixes", approvedAt: null, approvedBy: null, approvalRevoked: true });
    expect(nextChecklistState([item("pass"), item("pending")], approved)).toEqual({ status: "in_progress", approvedAt: null, approvedBy: null, approvalRevoked: true });
    // an optional item going back to pending keeps the approval
    expect(nextChecklistState([item("pass"), item("pending", { isRequired: false })], approved).status).toBe("approved");
  });

  it("a fix task being done never passes the QA item by itself", () => {
    // the rules only look at item statuses; a task status is not an input
    const items = [item("fail")];
    expect(deriveStatus(items)).toBe("needs_fixes");
    expect(nextChecklistState(items, { status: "needs_fixes", approvedAt: null, approvedBy: null }).status).toBe("needs_fixes");
  });

  it("finds the next unresolved item and groups by category", () => {
    const list = [{ ...item("pass"), category: "A", id: 1 }, { ...item("fail"), category: "A", id: 2 }, { ...item("pending"), category: "B", id: 3 }];
    expect(nextUnresolved(list)?.id).toBe(3);
    expect(nextUnresolved(list.slice(0, 2))?.id).toBe(2);
    expect(groupByCategory(list).map((g) => [g.category, g.items.length])).toEqual([["A", 2], ["B", 1]]);
  });
});

describe("project completion gate", () => {
  const cl = (status: QaChecklistOverview["status"], required = true, title = "QA") => ({ id: title, title, status, requiredForCompletion: required });

  it("no checklist → allowed (old projects unchanged)", () => {
    expect(completionGate([])).toEqual({ allowed: true, blocking: [] });
  });
  it("optional checklists never block", () => {
    expect(completionGate([cl("needs_fixes", false)]).allowed).toBe(true);
  });
  it("required unapproved checklist blocks and says which", () => {
    const g = completionGate([cl("approved", true, "Website QA"), cl("ready_for_review", true, "Content QA")]);
    expect(g.allowed).toBe(false);
    expect(g.blocking.map((c) => c.title)).toEqual(["Content QA"]);
  });
  it("required approved checklist allows", () => {
    expect(completionGate([cl("approved")]).allowed).toBe(true);
  });
});

describe("recommendation and overdue", () => {
  const tpl = (id: string, projectType: string | null, seedKey: string | null, isActive = true) => ({ id, projectType, seedKey, isActive });
  const templates = [tpl("w", "website", "website"), tpl("b", "branding", "branding"), tpl("3", "creative_3d", "creative_3d"), tpl("m", "marketing", "marketing"), tpl("g", "other", "generic"), tpl("old", "website", null, false)];

  it("recommends the template for the project type, generic otherwise", () => {
    expect(recommendTemplate("website", templates)?.id).toBe("w");
    expect(recommendTemplate("branding", templates)?.id).toBe("b");
    expect(recommendTemplate("creative_3d", templates)?.id).toBe("3");
    expect(recommendTemplate("marketing", templates)?.id).toBe("m");
    expect(recommendTemplate("retainer", templates)?.id).toBe("g");
    expect(recommendTemplate("custom-type", templates)?.id).toBe("g");
    expect(recommendTemplate("website", [tpl("only", null, null)])?.id).toBe("only");
    expect(recommendTemplate("website", [])).toBeNull();
  });

  it("archived templates are skipped for new checklists but stay valid history", () => {
    expect(recommendTemplate("website", [tpl("old", "website", "website", false), tpl("g", "other", "generic")])?.id).toBe("g");
  });

  it("detects overdue checklists", () => {
    expect(isOverdue("in_progress", "2026-09-07", "2026-09-08")).toBe(true);
    expect(isOverdue("in_progress", "2026-09-08", "2026-09-08")).toBe(false);
    expect(isOverdue("approved", "2026-09-01", "2026-09-08")).toBe(false);
    expect(isOverdue("needs_fixes", null, "2026-09-08")).toBe(false);
  });
});

describe("sampling validation", () => {
  const msg = { nameRequired: "", titleRequired: "t", categoryRequired: "", invalidDate: "d", invalidNumber: "n", invalidUrl: "", naNotAllowed: "", sampleExceedsDelivery: "s", tooLong: "" };
  it("accepts delivery / sample quantities and rejects a sample larger than the delivery", () => {
    expect(validateChecklist({ title: "3D batch", deliveryQuantity: "300", sampleQuantity: "20", samplingNote: "random 20" }, msg).data).toMatchObject({ deliveryQuantity: 300, sampleQuantity: 20, samplingNote: "random 20", requiredForCompletion: true });
    expect(validateChecklist({ title: "x", deliveryQuantity: "20", sampleQuantity: "30" }, msg).errors?.fieldErrors).toEqual({ sampleQuantity: "s" });
    expect(validateChecklist({ title: "x", deliveryQuantity: "abc" }, msg).errors?.fieldErrors).toEqual({ deliveryQuantity: "n" });
    expect(validateChecklist({ title: "", dueDate: "2026-99-99" }, msg).errors?.fieldErrors).toEqual({ title: "t", dueDate: "d" });
    expect(validateChecklist({ title: "x", requiredForCompletion: "false" }, msg).data?.requiredForCompletion).toBe(false);
  });
});

describe("overview, stats and attention", () => {
  const row = (over: Partial<QaChecklistOverview> & { id: string; status: QaChecklistOverview["status"] }): QaChecklistOverview => ({
    title: "QA", templateName: "Website QA", projectId: over.id, projectName: `Project ${over.id}`, clientName: null, projectType: "website", projectDeadline: null, projectOwnerName: null,
    reviewerId: null, reviewerName: null, dueDate: null, requiredForCompletion: true, approvedByName: null, approvedAt: null, overdue: false,
    progress: { total: 10, resolved: 5, passed: 5, failed: 0, blocked: 0, na: 0, pending: 5, requiredTotal: 10, requiredResolved: 5, percent: 50 }, ...over,
  });
  const list = [
    row({ id: "a", status: "approved", approvedAt: "2026-09-02T00:00:00Z" }),
    row({ id: "b", status: "needs_fixes", progress: { total: 10, resolved: 10, passed: 8, failed: 2, blocked: 0, na: 0, pending: 0, requiredTotal: 10, requiredResolved: 10, percent: 100 } }),
    row({ id: "c", status: "in_progress", overdue: true, dueDate: "2026-09-01" }),
    row({ id: "d", status: "ready_for_review" }),
    row({ id: "e", status: "in_progress", projectDeadline: "2026-09-10", projectName: "Zeta site" }),
    row({ id: "f", status: "not_started" }),
  ];

  it("sorts failed / overdue first, then ready, in progress, not started, approved", () => {
    expect(sortOverview(list).map((c) => c.id)).toEqual(["b", "c", "d", "e", "f", "a"]);
    expect(attentionGroupOf(list[2])).toBe("needs_attention");
  });

  it("filters", () => {
    expect(list.filter((c) => matchesFilters(c, { failedOnly: true })).map((c) => c.id)).toEqual(["b"]);
    expect(list.filter((c) => matchesFilters(c, { overdueOnly: true })).map((c) => c.id)).toEqual(["c"]);
    expect(list.filter((c) => matchesFilters(c, { awaitingReview: true })).map((c) => c.id)).toEqual(["d"]);
    expect(list.filter((c) => matchesFilters(c, { q: "zeta" })).map((c) => c.id)).toEqual(["e"]);
  });

  it("summarises a project and detects the completion block", () => {
    const s = summarizeProject("p", [list[1], row({ id: "x", status: "approved", requiredForCompletion: false })]);
    expect(s).toMatchObject({ checklists: 2, requiredChecklists: 1, approvedRequired: 0, failed: 2, blocked: 0, status: "needs_fixes", blocksCompletion: true });
    expect(summarizeProject("p", []).status).toBeNull();
    expect(summarizeProject("p", [row({ id: "y", status: "approved" })]).blocksCompletion).toBe(false);
  });

  it("returns stats and attention items", () => {
    const s = qaStats(list, "2026-09-08");
    expect(s).toEqual({ projectsWithQa: 6, needsFixes: 1, readyForReview: 1, inProgress: 3, approvedThisMonth: 1, overdue: 1 });
    const a = attentionItems(list);
    expect(a.map((x) => `${x.checklistId}:${x.reason}:${x.count}`)).toEqual(["b:failed:2", "c:overdue:1", "d:ready_for_review:1"]);
  });
});
