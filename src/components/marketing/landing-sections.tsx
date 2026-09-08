import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VERDICT_TONE } from "@/domain/enums";
import type { Verdict } from "@/generated/prisma/enums";
import { getT } from "@/i18n/server";
import type { FrontierPosition } from "@/services/value/proof-frontier";

/** Illustrative rows only — not measurements. Labelled "Example data" on the page. */
const EXAMPLE_RADAR: Array<{
  id: "leakage" | "noShow" | "idleCapacity" | "shrinkage" | "dynamicPricing";
  potential: number;
  evidence: number;
  value: number | null;
  causal: number | null;
  frontier: FrontierPosition;
  verdict: Verdict;
}> = [
  {
    id: "leakage",
    potential: 89,
    evidence: 91,
    value: 84,
    causal: 62,
    frontier: "OPERATIONAL_VALUE",
    verdict: "TEST",
  },
  {
    id: "noShow",
    potential: 87,
    evidence: 73,
    value: null,
    causal: null,
    frontier: "ECONOMIC_PAIN",
    verdict: "INTERVIEW",
  },
  {
    id: "idleCapacity",
    potential: 86,
    evidence: 72,
    value: 71,
    causal: null,
    frontier: "PAIN",
    verdict: "INTERVIEW",
  },
  {
    id: "shrinkage",
    potential: 82,
    evidence: 58,
    value: null,
    causal: null,
    frontier: "PAIN",
    verdict: "RESEARCH",
  },
  {
    id: "dynamicPricing",
    potential: 71,
    evidence: 31,
    value: null,
    causal: null,
    frontier: "NONE",
    verdict: "RESEARCH",
  },
];

const PIPELINE = [
  "market",
  "icp",
  "variable",
  "pain",
  "evidence",
  "opportunity",
  "mechanism",
  "causalChain",
  "proofFrontier",
  "experiment",
] as const;

const VALIDATION_LOOP = [
  "assumption",
  "experiment",
  "result",
  "evidence",
  "proofFrontier",
  "decision",
] as const;

const EVIDENCE_FIT_EXAMPLES = [
  "interview",
  "operationalData",
  "controlledTest",
  "purchase",
] as const;

const FOUR_QUESTIONS = ["potential", "evidence", "value", "causal"] as const;

const WHY_FAIL_ITEMS = [
  "productFirst",
  "reasoningAsProof",
  "noKillSwitch",
  "noCausalChain",
] as const;

const HOW_STEPS = ["talk", "structure", "evidence", "decide"] as const;

export async function LandingSections({ appHref }: { appHref: string }) {
  const t = await getT();
  return (
    <>
      <section className="bg-muted/40 border-y">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {t("marketing.whyFail.title")}
            </h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              {t("marketing.whyFail.body")}
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("marketing.whyFail.generatorsLabel")}
                </p>
                <p className="mt-1 font-medium">{t("marketing.whyFail.generatorsFlow")}</p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  {t("marketing.whyFail.ourLabel")}
                </p>
                <p className="mt-1 font-medium">{t("marketing.whyFail.ourFlow")}</p>
              </div>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            {WHY_FAIL_ITEMS.map((item) => (
              <li key={item} className="bg-background rounded-lg border p-4">
                <p className="font-medium">{t(`marketing.whyFail.${item}.title`)}</p>
                <p className="text-muted-foreground mt-1">{t(`marketing.whyFail.${item}.body`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="method" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("marketing.method.title")}</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          {t("marketing.method.bodyBefore")}{" "}
          <span className="text-foreground">{t("marketing.method.formula")}</span>
          {t("marketing.method.bodyAfter")}
        </p>
        <ol className="mt-8 flex flex-wrap gap-2">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="bg-background rounded-md border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t(`marketing.method.pipeline.${step}`)}
              </span>
              {i < PIPELINE.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            {t("marketing.evidenceDecides.title")}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            {t("marketing.evidenceDecides.body")}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {FOUR_QUESTIONS.map((score) => (
              <Card key={score}>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t(`marketing.evidenceDecides.questions.${score}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm leading-relaxed">
                  {t(`marketing.evidenceDecides.questions.${score}.question`)}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            {t("marketing.evidenceDecides.verdictNote.lowEvidence")}{" "}
            <span className="text-foreground font-medium">RESEARCH</span>
            {t("marketing.evidenceDecides.verdictNote.untestedMechanism")}{" "}
            <span className="text-foreground font-medium">TEST</span>{" "}
            {t("marketing.evidenceDecides.verdictNote.experiment")}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("marketing.fit.title")}</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          {t("marketing.fit.body")}
        </p>
        <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
          {EVIDENCE_FIT_EXAMPLES.map((example) => (
            <div key={example} className="bg-muted/40 rounded-lg border p-4">
              <p className="text-[10px] font-medium tracking-wider uppercase">
                {t(`marketing.fit.examples.${example}.source`)}
              </p>
              <p className="mt-1">
                <span className="text-muted-foreground">{t("marketing.fit.establishes")}</span>{" "}
                {t(`marketing.fit.examples.${example}.proves`)}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {t("marketing.fit.cannot", {
                  claim: t(`marketing.fit.examples.${example}.cannot`),
                })}
              </p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm">{t("marketing.fit.footnote")}</p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">{t("marketing.decision.title")}</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          {t("marketing.decision.body")}
        </p>
        <ol className="mt-8 flex flex-wrap gap-2">
          {VALIDATION_LOOP.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="bg-background rounded-md border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {t(`marketing.decision.loop.${step}`)}
              </span>
              {i < VALIDATION_LOOP.length - 1 && (
                <span className="text-muted-foreground text-xs">→</span>
              )}
            </li>
          ))}
        </ol>
        <div className="mt-6 grid gap-3 text-sm md:grid-cols-2">
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t("marketing.decision.discoveryLoopLabel")}
            </p>
            <p className="mt-1">{t("marketing.decision.discoveryLoop")}</p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              {t("marketing.decision.validationLoopLabel")}
            </p>
            <p className="mt-1">{t("marketing.decision.validationLoop")}</p>
          </div>
        </div>
      </section>

      <section id="radar" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">{t("marketing.radar.title")}</h2>
          <Badge variant="muted">{t("marketing.radar.badge")}</Badge>
        </div>
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("marketing.radar.columns.opportunity")}</TableHead>
                <TableHead className="text-right">
                  {t("marketing.radar.columns.potential")}
                </TableHead>
                <TableHead className="text-right">
                  {t("marketing.radar.columns.evidence")}
                </TableHead>
                <TableHead className="text-right">{t("marketing.radar.columns.value")}</TableHead>
                <TableHead className="text-right">{t("marketing.radar.columns.causal")}</TableHead>
                <TableHead>{t("marketing.radar.columns.proofFrontier")}</TableHead>
                <TableHead>{t("marketing.radar.columns.verdict")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EXAMPLE_RADAR.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">
                    {t(`marketing.radar.rows.${row.id}`)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.potential}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.evidence}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.value ?? (
                      <span className="text-tone-warning text-[10px]">
                        {t("marketing.radar.incomplete")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.causal ?? (
                      <span className="text-tone-warning text-[10px]">
                        {t("marketing.radar.incomplete")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{t(`labels.proofRung.${row.frontier}`)}</TableCell>
                  <TableCell>
                    <Badge variant={VERDICT_TONE[row.verdict]}>{row.verdict}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">{t("marketing.radar.note")}</p>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">{t("marketing.how.title")}</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {HOW_STEPS.map((step, i) => (
              <div key={step} className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 font-medium">{t(`marketing.how.steps.${step}.title`)}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {t(`marketing.how.steps.${step}.body`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">{t("marketing.cta.title")}</h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl">{t("marketing.cta.body")}</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={appHref}>{t("marketing.hero.findOpportunity")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={`${appHref}?intent=validate`}>{t("marketing.hero.validateIdea")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
