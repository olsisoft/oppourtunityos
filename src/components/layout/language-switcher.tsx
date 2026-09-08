"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";

import { setLocaleAction } from "@/actions/locale";
import { useLocale, useT } from "@/i18n/client";
import { LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

/** EN | FR toggle. The choice is stored in a cookie and on the account. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const choose = (next: Locale) => {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocaleAction(next);
      router.refresh();
    });
  };

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={cn(
        "text-muted-foreground inline-flex items-center gap-0.5 rounded-md border p-0.5 text-xs",
        pending && "opacity-60",
        className,
      )}
    >
      <Languages className="ml-1 size-3.5" aria-hidden />
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => choose(code)}
          disabled={pending}
          aria-pressed={code === locale}
          aria-label={LOCALE_LABELS[code]}
          title={LOCALE_LABELS[code]}
          className={cn(
            "rounded px-1.5 py-0.5 font-medium uppercase transition-colors",
            code === locale
              ? "bg-foreground text-background"
              : "hover:bg-accent hover:text-foreground",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
