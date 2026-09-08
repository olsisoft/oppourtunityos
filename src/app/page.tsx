import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { auth } from "@/auth";
import { Brand } from "@/components/layout/brand";
import { LandingSections } from "@/components/marketing/landing-sections";
import { Button } from "@/components/ui/button";

export default async function LandingPage() {
  const session = await auth();
  const appHref = session?.user ? "/app" : "/register";

  return (
    <div className="bg-background min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Brand />
          <nav className="flex items-center gap-2 text-sm">
            <Button variant="ghost" size="sm" asChild>
              <Link href="#method">Method</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link href="#radar">Radar</Link>
            </Button>
            {session?.user ? (
              <Button size="sm" asChild>
                <Link href="/app">Open workspace</Link>
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/register">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-6 pt-20 pb-16">
          <p className="text-muted-foreground mb-4 text-xs font-medium tracking-[0.18em] uppercase">
            Evidence-driven opportunity discovery
          </p>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Know what is worth building before you spend months building it.
          </h1>
          <p className="mt-4 max-w-2xl text-xl text-balance">
            OpportunityOS turns market hypotheses into evidence-backed, falsifiable opportunities —
            and shows exactly what still needs proving.
          </p>
          <p className="text-muted-foreground mt-4 max-w-2xl text-base leading-relaxed">
            Stop asking AI for startup ideas. Map markets, identify valuable variables, analyze pain
            and evidence, trace the causal chain from mechanism to value, test the weakest link and
            watch your confidence change.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href={`${appHref}?intent=discover`}>
                Find an opportunity <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href={`${appHref}?intent=validate`}>Validate an idea</Link>
            </Button>
          </div>
          <p className="text-muted-foreground mt-6 text-xs">
            Hypothesis ≠ Evidence. Every opportunity carries four independent scores and a Proof
            Frontier. The AI doesn&apos;t decide what&apos;s true. Evidence does. And evidence
            isn&apos;t just a source: it has to fit the claim.
          </p>
        </section>

        <LandingSections appHref={appHref} />
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs">
          <span>OpportunityOS — discover economic anomalies, not ideas.</span>
          <span>Don&apos;t generate ideas. Discover economic anomalies.</span>
        </div>
      </footer>
    </div>
  );
}
