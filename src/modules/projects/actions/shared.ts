import "server-only";

import { revalidatePath } from "next/cache";

import { getModule } from "@/config/modules";
import { getDictionary } from "@/lib/i18n/server";
import { interpolate } from "@/lib/i18n/interpolate";

import type { ActionResult } from "../types";

export function revalidateProjects() {
  revalidatePath(getModule("projects").href, "layout");
  revalidatePath(getModule("pricing").href);
}

export async function fail(message: string | undefined): Promise<ActionResult> {
  const dict = await getDictionary();
  return { error: interpolate(dict.projects.errors.saveFailed, { message: message ?? "unknown" }) };
}
