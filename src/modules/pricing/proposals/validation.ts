import { CURRENCIES } from "@/config/currencies";

import { newItemId, normalizeItem } from "./calculations";
import type { ActionResult, ProposalInput, ProposalItem } from "./types";

export interface ProposalValidationMessages {
  titleRequired: string;
  invalidNumber: string;
  itemTitleRequired: string;
  vatRange: string;
  invalidDate: string;
}

type Outcome = { data: ProposalInput; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown): number | undefined => {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(String(v).replace(",", ".").replace(/\s/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

export function validateProposal(raw: unknown, msg: ProposalValidationMessages): Outcome {
  if (!isRecord(raw)) return { errors: { error: msg.titleRequired } };
  const fieldErrors: Record<string, string> = {};
  const title = text(raw.title, 200);
  if (!title) fieldErrors.title = msg.titleRequired;
  const vatRate = num(raw.vatRate);
  if (vatRate === undefined || vatRate > 100) fieldErrors.vatRate = msg.vatRange;
  const validUntilRaw = text(raw.validUntil, 10);
  const validUntil = validUntilRaw ? (/^\d{4}-\d{2}-\d{2}$/.test(validUntilRaw) && !Number.isNaN(Date.parse(validUntilRaw)) ? validUntilRaw : undefined) : null;
  if (validUntil === undefined) fieldErrors.validUntil = msg.invalidDate;

  const items: ProposalItem[] = [];
  const rawItems = Array.isArray(raw.items) ? raw.items.slice(0, 40) : [];
  rawItems.forEach((r, index) => {
    if (!isRecord(r)) return;
    const itemTitle = text(r.title, 200);
    if (!itemTitle) fieldErrors[`items.${index}.title`] = msg.itemTitleRequired;
    const kind = r.kind === "hourly" ? "hourly" : r.kind === "unit" ? "unit" : "fixed";
    const hours = num(r.hours);
    const rate = num(r.rate);
    const amount = num(r.amount);
    const quantity = num(r.quantity);
    const unitPrice = num(r.unitPrice);
    if (hours === undefined) fieldErrors[`items.${index}.hours`] = msg.invalidNumber;
    if (rate === undefined) fieldErrors[`items.${index}.rate`] = msg.invalidNumber;
    if (amount === undefined) fieldErrors[`items.${index}.amount`] = msg.invalidNumber;
    if (quantity === undefined || unitPrice === undefined) fieldErrors[`items.${index}.quantity`] = msg.invalidNumber;
    if (itemTitle && hours !== undefined && rate !== undefined && amount !== undefined && quantity !== undefined && unitPrice !== undefined) {
      items.push(normalizeItem({
        id: text(r.id, 64) || newItemId(), title: itemTitle, description: text(r.description, 600), kind,
        hours: kind === "hourly" ? hours : 0, rate: kind === "hourly" ? rate : 0, amount: kind === "fixed" ? amount : 0,
        quantity: kind === "unit" ? quantity : 0, unitPrice: kind === "unit" ? unitPrice : 0, unitLabel: kind === "unit" ? text(r.unitLabel, 30) || null : null,
      }));
    }
  });

  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };
  return {
    data: {
      title,
      clientName: text(raw.clientName, 200) || null,
      intro: text(raw.intro, 2000) || null,
      currency: CURRENCIES.find((c) => c === raw.currency) ?? "CZK",
      vatRate: vatRate as number,
      items,
      notes: text(raw.notes, 2000) || null,
      validUntil: validUntil ?? null,
    },
  };
}
