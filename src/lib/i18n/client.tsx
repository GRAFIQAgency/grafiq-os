"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Dictionary, Locale } from "./config";

interface I18nContextValue {
  locale: Locale;
  dict: Dictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

interface I18nProviderProps extends I18nContextValue {
  children: ReactNode;
}

/** Mounted once in the root layout; makes the dictionary available to client components. */
export function I18nProvider({ locale, dict, children }: I18nProviderProps) {
  return <I18nContext.Provider value={{ locale, dict }}>{children}</I18nContext.Provider>;
}

/** Client-side access to the current locale and dictionary. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
