import type { QaTemplateItem } from "../types";

/** The frozen copy of a template item stored on a project checklist. */
export interface SnapshotItem {
  templateItemId: string;
  category: string;
  title: string;
  description: string | null;
  isRequired: boolean;
  allowNa: boolean;
  position: number;
}

/**
 * Copies template items into checklist items. The result carries plain
 * values only (no reference back except the id for traceability), so later
 * template edits never change the checklist. Pure; tested.
 */
export function snapshotItems(items: readonly QaTemplateItem[]): SnapshotItem[] {
  return [...items]
    .sort((a, b) => a.position - b.position)
    .map((i, position) => ({
      templateItemId: i.id,
      category: i.category,
      title: i.title,
      description: i.description,
      isRequired: i.isRequired,
      allowNa: i.allowNa,
      position,
    }));
}

/** Title of the fix task created from a failed / blocked item. */
export function fixTaskTitle(prefix: string, itemTitle: string): string {
  return `${prefix}: ${itemTitle}`.slice(0, 200);
}
