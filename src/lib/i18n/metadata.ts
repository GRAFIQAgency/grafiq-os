import type { Metadata } from "next";

import type { ModuleId } from "@/config/modules";

import { getDictionary } from "./server";

/** `export const generateMetadata = moduleMetadata("pricing")` gives a localised tab title. */
export function moduleMetadata(id: ModuleId) {
  return async function generateMetadata(): Promise<Metadata> {
    const dict = await getDictionary();
    return { title: dict.modules[id].title };
  };
}
