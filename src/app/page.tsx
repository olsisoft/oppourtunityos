import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { Brand } from "@/components/layout/brand";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LandingSections } from "@/components/marketing/landing-sections";
import { Button } from "@/components/ui/button";
import { getT } from "@/i18n/server";

export default async function LandingPage() {
  const session = await auth();
  const t = await getT();
  const appHref = session?.user ? "/app" : "/register";

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Brand />
          <nav className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="#method">{t("marketing.nav.method")}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="#radar">{t("marketing.nav.radar")}</Link>
            </Button>
            <LanguageSwitcher />
            {session?.user ? (
              <Button size="sm" asChild>
                <Link href="/app">{t("marketing.nav.openWorkspace")}</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">{t("marketing.nav.signIn")}</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">{t("marketing.nav.getStarted")}</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.18em] uppercase">
            {t("marketing.hero.eyebrow")}
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            {t("marketing.hero.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-balance">{t("marketing.hero.subtitle")}</p>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
            {t("marketing.hero.body")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href={`${appHref}?intent=discover`}>
                {t("marketing.hero.findOpportunity")} <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`${appHref}?intent=validate`}>{t("marketing.hero.validateIdea")}</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-6 text-xs">{t("marketing.hero.note")}</p>
        </section>

        <LandingSections appHref={appHref} />
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs">
          <span>{t("marketing.footer.tagline")}</span>
          <span>{t("marketing.footer.motto")}</span>
        </div>
      </footer>
    </div>
  );
}
