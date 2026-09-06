import { CURRENCIES } from "./constants";
import type { CostItemInput, EstimateInput, SaveEstimateResult } from "./types";

type ValidationOutcome =
  | { data: EstimateInput; errors?: undefined }
  | { data?: undefined; errors: SaveEstimateResult };

const MAX_NAME = 200;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNonNegativeNumber(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Validates untrusted input (from the client) into a well-typed EstimateInput.
 * Dependency-free on purpose; swap for zod if forms grow more complex.
 */
export function validateEstimateInput(raw: unknown): ValidationOutcome {
  const fieldErrors: Record<string, string> = {};
  if (!isRecord(raw)) return { errors: { error: "Invalid estimate payload." } };

  const projectName = asText(raw.projectName);
  if (!projectName) fieldErrors.projectName = "Project name is required.";
  else if (projectName.length > MAX_NAME) fieldErrors.projectName = `Max ${MAX_NAME} characters.`;

  const clientName = asText(raw.clientName);
  if (clientName.length > MAX_NAME) fieldErrors.clientName = `Max ${MAX_NAME} characters.`;

  const currency = CURRENCIES.find((c) => c === raw.currency);
  if (!currency) fieldErrors.currency = "Choose a currency.";

  const revenue = asNonNegativeNumber(raw.revenue);
  if (revenue === null) fieldErrors.revenue = "Enter a valid client price.";

  const targetMargin = asNonNegativeNumber(raw.targetMargin);
  if (targetMargin === null || targetMargin >= 100) {
    fieldErrors.targetMargin = "Target margin must be between 0 and 99.99.";
  }

  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  const items: CostItemInput[] = [];
  rawItems.forEach((item, index) => {
    if (!isRecord(item)) return;
    const name = asText(item.name);
    const kind = item.kind === "fixed" ? "fixed" : item.kind === "hourly" ? "hourly" : null;
    const hours = asNonNegativeNumber(item.hours ?? 0);
    const hourlyRate = asNonNegativeNumber(item.hourlyRate ?? 0);
    const fixedAmount = asNonNegativeNumber(item.fixedAmount ?? 0);

    if (!name) fieldErrors[`items.${index}.name`] = "Cost name is required.";
    if (!kind) fieldErrors[`items.${index}.kind`] = "Invalid cost type.";
    if (hours === null) fieldErrors[`items.${index}.hours`] = "Invalid hours.";
    if (hourlyRate === null) fieldErrors[`items.${index}.hourlyRate`] = "Invalid rate.";
    if (fixedAmount === null) fieldErrors[`items.${index}.fixedAmount`] = "Invalid amount.";

    if (name && kind && hours !== null && hourlyRate !== null && fixedAmount !== null) {
      items.push({ name, kind, hours, hourlyRate, fixedAmount });
    }
  });

  const id = typeof raw.id === "string" && raw.id ? raw.id : undefined;

  if (Object.keys(fieldErrors).length > 0) {
    return { errors: { error: "Please fix the highlighted fields.", fieldErrors } };
  }

  return {
    data: {
      id,
      projectName,
      clientName,
      currency: currency as EstimateInput["currency"],
      revenue: revenue as number,
      targetMargin: targetMargin as number,
      items,
    },
  };
}
