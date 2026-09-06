import { cache } from "react";
import { cookies } from "next/headers";

import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Dictionary, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

/** Current UI locale from the cookie (Server Components, Actions, Route Handlers). */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

export async function getDictionary(): Promise<Dictionary> {
  return dictionaries[await getLocale()];
}
