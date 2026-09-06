import type en from "./dictionaries/en";

export const LOCALES = ["en", "cs"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie that stores the user's UI language. */
export const LOCALE_COOKIE = "grafiq:locale";

/** The English dictionary is the schema; every other locale must match it. */
export type Dictionary = typeof en;

export const LOCALE_LABELS: Record<Locale, string> = { en: "EN", cs: "CS" };

/** BCP 47 tags used for Intl formatting. */
export const INTL_LOCALES: Record<Locale, string> = { en: "en-GB", cs: "cs-CZ" };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
