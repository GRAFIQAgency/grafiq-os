import { ITEM_STATUSES } from "./constants";
import type { ActionResult, ChecklistInput, ItemUpdateInput, TemplateInput, TemplateItemInput } from "./types";

export interface QaValidationMessages {
  nameRequired: string;
  titleRequired: string;
  categoryRequired: string;
  invalidDate: string;
  invalidNumber: string;
  invalidUrl: string;
  naNotAllowed: string;
  sampleExceedsDelivery: string;
  tooLong: string;
}

type Outcome<T> = { data: T; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bool = (v: unknown) => v === true || v === "true" || v === "on" || v === "1";
const optNum = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
const optDate = (v: unknown): string | null | undefined => {
  const s = text(v, 10);
  if (!s) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
};
const optId = (v: unknown) => text(v, 64) || null;
const fail = (fieldErrors: Record<string, string>): { errors: ActionResult } => ({ errors: { error: Object.values(fieldErrors)[0], fieldErrors } });

export function validateTemplate(raw: unknown, msg: QaValidationMessages): Outcome<TemplateInput> {
  if (!isRecord(raw)) return fail({ name: msg.nameRequired });
  const e: Record<string, string> = {};
  const name = text(raw.name, 120);
  if (!name) e.name = msg.nameRequired;
  if (typeof raw.description === "string" && raw.description.length > 1000) e.description = msg.tooLong;
  if (Object.keys(e).length) return fail(e);
  return { data: { name, description: text(raw.description, 1000) || null, projectType: text(raw.projectType, 60) || null, isActive: raw.isActive === undefined ? true : bool(raw.isActive) } };
}

export function validateTemplateItem(raw: unknown, msg: QaValidationMessages): Outcome<TemplateItemInput> {
  if (!isRecord(raw)) return fail({ title: msg.titleRequired });
  const e: Record<string, string> = {};
  const title = text(raw.title, 200);
  const category = text(raw.category, 80);
  if (!title) e.title = msg.titleRequired;
  if (!category) e.category = msg.categoryRequired;
  if (Object.keys(e).length) return fail(e);
  return { data: { category, title, description: text(raw.description, 1000) || null, isRequired: raw.isRequired === undefined ? true : bool(raw.isRequired), allowNa: bool(raw.allowNa) } };
}

/** Checklist header: title, reviewer, due date, required flag and the sampling fields. */
export function validateChecklist(raw: unknown, msg: QaValidationMessages): Outcome<ChecklistInput> {
  if (!isRecord(raw)) return fail({ title: msg.titleRequired });
  const e: Record<string, string> = {};
  const title = text(raw.title, 160);
  if (!title) e.title = msg.titleRequired;
  const dueDate = optDate(raw.dueDate);
  if (dueDate === undefined) e.dueDate = msg.invalidDate;
  const deliveryQuantity = optNum(raw.deliveryQuantity);
  const sampleQuantity = optNum(raw.sampleQuantity);
  if (deliveryQuantity === undefined) e.deliveryQuantity = msg.invalidNumber;
  if (sampleQuantity === undefined) e.sampleQuantity = msg.invalidNumber;
  if (deliveryQuantity != null && sampleQuantity != null && sampleQuantity > deliveryQuantity) e.sampleQuantity = msg.sampleExceedsDelivery;
  if (typeof raw.samplingNote === "string" && raw.samplingNote.length > 1000) e.samplingNote = msg.tooLong;
  if (Object.keys(e).length) return fail(e);
  return {
    data: {
      title,
      reviewerId: optId(raw.reviewerId),
      dueDate: dueDate ?? null,
      requiredForCompletion: raw.requiredForCompletion === undefined ? true : bool(raw.requiredForCompletion),
      deliveryQuantity: deliveryQuantity ?? null,
      sampleQuantity: sampleQuantity ?? null,
      samplingNote: text(raw.samplingNote, 1000) || null,
    },
  };
}

/** Item review: status (N/A only when the frozen item allows it), note, evidence URL, assignee. */
export function validateItemUpdate(raw: unknown, item: { allowNa: boolean }, msg: QaValidationMessages): Outcome<ItemUpdateInput> {
  if (!isRecord(raw)) return fail({ status: msg.naNotAllowed });
  const e: Record<string, string> = {};
  const status = ITEM_STATUSES.find((s) => s === raw.status) ?? "pending";
  if (status === "na" && !item.allowNa) e.status = msg.naNotAllowed;
  const evidenceUrl = text(raw.evidenceUrl, 1000);
  if (evidenceUrl && !/^https?:\/\//i.test(evidenceUrl)) e.evidenceUrl = msg.invalidUrl;
  if (typeof raw.note === "string" && raw.note.length > 2000) e.note = msg.tooLong;
  if (Object.keys(e).length) return fail(e);
  return { data: { status, note: text(raw.note, 2000) || null, evidenceUrl: evidenceUrl || null, assigneeMemberId: optId(raw.assigneeMemberId) } };
}
