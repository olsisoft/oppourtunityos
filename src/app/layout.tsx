import type { Metadata } from "next";

import { Toaster } from "@/components/ui/sonner";
import { LocaleProvider } from "@/i18n/client";
import { getLocale, getT } from "@/i18n/server";
import { LOCALE_TAGS } from "@/i18n/locales";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: { default: "OpportunityOS", template: "%s · OpportunityOS" },
    description: t("marketing.metaDescription"),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  return (
    <html lang={LOCALE_TAGS[locale]} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <LocaleProvider locale={locale}>
          {children}
          <Toaster position="bottom-right" />
        </LocaleProvider>
      </body>
    </html>
  );
}
