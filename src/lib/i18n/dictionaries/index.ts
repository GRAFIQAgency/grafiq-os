import type { Dictionary, Locale } from "../config";

import cs from "./cs";
import en from "./en";

export const dictionaries: Record<Locale, Dictionary> = { en, cs };
