import type { CompletionGate, RequiredChecklistState } from "../types";

/**
 * Project completion gate (pure):
 *   - no checklist at all            → allowed (old projects keep their behaviour)
 *   - only optional checklists       → allowed
 *   - any REQUIRED checklist that is not approved → blocked, with the list
 */
export function completionGate(checklists: readonly RequiredChecklistState[]): CompletionGate {
  const blocking = checklists.filter((c) => c.requiredForCompletion && c.status !== "approved");
  return { allowed: blocking.length === 0, blocking };
}
