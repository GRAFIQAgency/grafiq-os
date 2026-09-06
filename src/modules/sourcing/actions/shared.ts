import "server-only";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ActionResult } from "../types";

export function revalidateSourcing() {
  revalidatePath(getModule("sourcing").href, "layout");
}

export async function failure(error: { message: string } | null | undefined): Promise<ActionResult> {
  const dict = await getDictionary();
  return { error: interpolate(dict.sourcing.errors.saveFailed, { message: error?.message ?? "unknown" }) };
}

export function cleanIds(ids: unknown): string[] {
  return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, 500) : [];
}

export function cleanTags(tags: unknown): string[] {
  const list = Array.isArray(tags) ? tags : typeof tags === "string" ? [tags] : [];
  return [...new Set(list.map((t) => String(t).trim().toLowerCase().slice(0, 40)).filter(Boolean))].slice(0, 30);
}

export function cleanScore(score: unknown): number | null {
  if (score === null || score === "" || score === undefined) return null;
  const n = Number(score);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
}
