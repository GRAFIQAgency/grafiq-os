"use server";

import { getDictionary } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/modules/auth/queries";
import type { QaTemplateItemRow, QaTemplateRow } from "@/types/database";

import type { ActionResult } from "../types";
import { validateTemplate, validateTemplateItem } from "../validation";
import { fail, revalidateQa } from "./shared";

export interface TemplateResult extends ActionResult {
  id?: string;
}

/** New template (empty, active). Items are added in the editor. */
export async function createTemplate(raw: unknown): Promise<TemplateResult> {
  const dict = await getDictionary();
  const v = validateTemplate(raw, dict.qa.validation);
  if (v.errors) return v.errors;
  const user = await getCurrentUser();
  const supabase = await createClient();
  const { data: last } = await supabase.from("qa_templates").select("position").order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
  const { data, error } = await supabase.from("qa_templates").insert({ ...toRow(v.data), created_by: user?.user.id ?? null, position: (last?.position ?? -1) + 1 }).select("id").single<{ id: string }>();
  if (error || !data) return fail(error?.message);
  revalidateQa();
  return { id: data.id };
}

function toRow(d: { name: string; description: string | null; projectType: string | null; isActive: boolean }) {
  return { name: d.name, description: d.description, project_type: d.projectType, is_active: d.isActive };
}

export async function updateTemplate(id: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateTemplate(raw, dict.qa.validation);
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { error } = await supabase.from("qa_templates").update(toRow(v.data)).eq("id", id);
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

/** Archive / restore. Archived templates stay valid for the checklists that used them. */
export async function setTemplateActive(id: string, isActive: boolean): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("qa_templates").update({ is_active: Boolean(isActive) }).eq("id", id);
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

export async function duplicateTemplate(id: string): Promise<TemplateResult> {
  const dict = await getDictionary();
  const user = await getCurrentUser();
  const supabase = await createClient();
  const [{ data: t }, { data: items }] = await Promise.all([
    supabase.from("qa_templates").select("*").eq("id", id).maybeSingle<QaTemplateRow>(),
    supabase.from("qa_template_items").select("*").eq("template_id", id).order("position").returns<QaTemplateItemRow[]>(),
  ]);
  if (!t) return { error: dict.qa.errors.notFound };
  const { data: last } = await supabase.from("qa_templates").select("position").order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
  const { data: created, error } = await supabase.from("qa_templates").insert({
    name: `${t.name} ${dict.qa.templates.copySuffix}`.slice(0, 120), description: t.description, project_type: t.project_type, is_active: true,
    created_by: user?.user.id ?? null, position: (last?.position ?? -1) + 1,
  }).select("id").single<{ id: string }>();
  if (error || !created) return fail(error?.message);
  if (items?.length) {
    const { error: e2 } = await supabase.from("qa_template_items").insert(items.map((i) => ({ template_id: created.id, category: i.category, title: i.title, description: i.description, is_required: i.is_required, allow_na: i.allow_na, position: i.position })));
    if (e2) return fail(e2.message);
  }
  revalidateQa();
  return { id: created.id };
}

/** Hard delete is allowed only for templates no checklist ever referenced; otherwise archive. */
export async function deleteTemplate(id: string): Promise<ActionResult> {
  const dict = await getDictionary();
  const supabase = await createClient();
  const { count } = await supabase.from("qa_checklists").select("id", { count: "exact", head: true }).eq("template_id", id);
  if ((count ?? 0) > 0) return { error: dict.qa.errors.templateInUse };
  const { error } = await supabase.from("qa_templates").delete().eq("id", id);
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

// ---------------------------------------------------------------------------
// Items
// ---------------------------------------------------------------------------

export async function addTemplateItem(templateId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateTemplateItem(raw, dict.qa.validation);
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const { data: last } = await supabase.from("qa_template_items").select("position").eq("template_id", templateId).order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
  const d = v.data;
  const { error } = await supabase.from("qa_template_items").insert({ template_id: templateId, category: d.category, title: d.title, description: d.description, is_required: d.isRequired, allow_na: d.allowNa, position: (last?.position ?? -1) + 1 });
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

export async function updateTemplateItem(itemId: string, raw: unknown): Promise<ActionResult> {
  const dict = await getDictionary();
  const v = validateTemplateItem(raw, dict.qa.validation);
  if (v.errors) return v.errors;
  const supabase = await createClient();
  const d = v.data;
  const { error } = await supabase.from("qa_template_items").update({ category: d.category, title: d.title, description: d.description, is_required: d.isRequired, allow_na: d.allowNa }).eq("id", itemId);
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

export async function deleteTemplateItem(itemId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("qa_template_items").delete().eq("id", itemId);
  if (error) return fail(error.message);
  revalidateQa();
  return {};
}

/** Swaps positions with the neighbour above / below (positions are renumbered first so gaps never matter). */
export async function moveTemplateItem(itemId: string, direction: "up" | "down"): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: me } = await supabase.from("qa_template_items").select("template_id").eq("id", itemId).maybeSingle<{ template_id: string }>();
  if (!me) return {};
  const { data: items } = await supabase.from("qa_template_items").select("id, position").eq("template_id", me.template_id).order("position").returns<{ id: string; position: number }[]>();
  const list = items ?? [];
  const index = list.findIndex((i) => i.id === itemId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= list.length) return {};
  [list[index], list[target]] = [list[target], list[index]];
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].position !== i) {
      const { error } = await supabase.from("qa_template_items").update({ position: i }).eq("id", list[i].id);
      if (error) return fail(error.message);
    }
  }
  revalidateQa();
  return {};
}
