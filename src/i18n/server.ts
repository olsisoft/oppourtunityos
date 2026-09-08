/**
 * Locale resolution for server components, route handlers and actions:
 *   1. the explicit choice stored in the locale cookie,
 *   2. otherwise the browser's Accept-Language header.
 * The account preference (User.locale) is written into the cookie at login,
 * so it follows the user across browsers without a database read per request.
 */
import { cache } from "react";
import { cookies, headers } from "next/headers";

import { isLocale, LOCALE_COOKIE, negotiateLocale, type Locale } from "./locales";
import { createT, type T } from "./t";

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  const chosen = store.get(LOCALE_COOKIE)?.value;
  if (isLocale(chosen)) return chosen;
  const requestHeaders = await headers();
  return negotiateLocale(requestHeaders.get("accept-language"));
});

/** Translation function for server components and actions. */
export async function getT(): Promise<T> {
  return createT(await getLocale());
}
