import type { ActionResult, InternalCapacityInput } from "./types";

export interface CapacityValidationMessages {
  hoursRange: string;
  invalidNumber: string;
  tooLong: string;
}

type Outcome = { data: InternalCapacityInput; errors?: undefined } | { data?: undefined; errors: ActionResult };

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const num = (v: unknown): number | null | undefined => {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Internal user capacity: monthly hours required (0–744), preferred optional, active flag. */
export function validateInternalCapacity(raw: unknown, msg: CapacityValidationMessages): Outcome {
  if (!isRecord(raw)) return { errors: { error: msg.invalidNumber } };
  const fieldErrors: Record<string, string> = {};
  const monthly = num(raw.monthlyCapacityHours);
  if (monthly === undefined || monthly === null || monthly > 744) fieldErrors.monthlyCapacityHours = msg.hoursRange;
  const preferred = num(raw.preferredMonthlyHours);
  if (preferred === undefined || (preferred ?? 0) > 744) fieldErrors.preferredMonthlyHours = msg.hoursRange;
  const notes = typeof raw.notes === "string" ? raw.notes.trim() : "";
  if (notes.length > 500) fieldErrors.notes = msg.tooLong;
  if (Object.keys(fieldErrors).length) return { errors: { error: Object.values(fieldErrors)[0], fieldErrors } };
  const active = raw.capacityActive === true || raw.capacityActive === "on" || raw.capacityActive === "true" || raw.capacityActive === "1";
  return {
    data: {
      monthlyCapacityHours: Math.round(monthly as number),
      preferredMonthlyHours: preferred == null ? null : Math.round(preferred),
      capacityActive: active,
      notes: notes || null,
    },
  };
}
