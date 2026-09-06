import type { Currency } from "@/types/database";

/** Currencies supported across GRAFIQ OS. Adding one also needs a DB migration (check constraints). */
export const CURRENCIES: readonly Currency[] = ["CZK", "EUR", "USD"];
