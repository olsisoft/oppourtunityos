"use client";

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, type Locale } from "./locales";
import { createT, type T } from "./t";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

/** Provides the current locale to client components (dictionaries are bundled). */
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Translation function for client components. */
export function useT(): T {
  const locale = useLocale();
  return useMemo(() => createT(locale), [locale]);
}
