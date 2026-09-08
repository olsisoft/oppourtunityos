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

/** Illustrative rows only — not measurements. Labelled "Example data" on the page. */
const EXAMPLE_RADAR: Array<{
  title: string;
  potential: number;
  evidence: number;
  value: number | null;
  causal: number | null;
  frontier: string;
  verdict: Verdict;
}> = [
  {
    title: "Employee revenue leakage",
    potential: 89,
    evidence: 91,
    value: 84,
    causal: 62,
    frontier: "Operational value",
    verdict: "TEST",
  },
  {
    title: "Salon no-show prevention",
    potential: 87,
    evidence: 73,
    value: null,
    causal: null,
    frontier: "Economic pain",
    verdict: "INTERVIEW",
  },
  {
    title: "Idle capacity",
    potential: 86,
    evidence: 72,
    value: 71,
    causal: null,
    frontier: "Pain",
    verdict: "INTERVIEW",
  },
  {
    title: "Inventory shrinkage",
    potential: 82,
    evidence: 58,
    value: null,
    causal: null,
    frontier: "Pain",
    verdict: "RESEARCH",
  },
  {
    title: "Dynamic pricing",
    potential: 71,
    evidence: 31,
    value: null,
    causal: null,
    frontier: "Nothing supported yet",
    verdict: "RESEARCH",
  },
];

const PIPELINE = [
  "Market",
  "ICP",
  "Valuable variable",
  "Pain",
  "Evidence",
  "Opportunity",
  "Mechanism",
  "Causal chain",
  "Proof frontier",
  "Experiment",
];

const VALIDATION_LOOP = [
  "Assumption",
  "Experiment",
  "Result",
  "Evidence",
  "Proof frontier",
  "Decision",
];

const EVIDENCE_FIT_EXAMPLES: Array<[string, string, string]> = [
  ["Interview", "that a pain exists and how it is described", "its magnitude, nor causality"],
  ["Operational data", "frequency and magnitude, as measured", "that a mechanism caused a change"],
  ["Controlled test", "a causal effect within the tested scope", "the whole market"],
  ["Purchase", "willingness to pay and actual purchase", "that the product created value"],
];

const FOUR_QUESTIONS = [
  ["Opportunity Potential", "Is the problem structurally attractive?"],
  ["Evidence Confidence", "Do we have credible evidence that the problem is real?"],
  ["Value Strength", "If we move the variable, how much value could be created?"],
  ["Causal Confidence", "Do we know that the proposed mechanism can actually move it?"],
];

export function LandingSections({ appHref }: { appHref: string }) {
  return (
    <>
      <section className="bg-muted/40 border-y">
        <div className="mx-auto grid max-w-6xl gap-8 px-6 py-16 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Why idea generators fail</h2>
            <p className="text-muted-foreground mt-3 leading-relaxed">
              They start from a product and justify it afterwards. They praise everything. They
              confuse a plausible story with a customer who loses money every week. The output looks
              like progress and costs you months.
            </p>
            <div className="mt-6 grid gap-3 text-sm">
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  Most AI idea generators
                </p>
                <p className="mt-1 font-medium">Idea → justification</p>
              </div>
              <div className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
                  OpportunityOS
                </p>
                <p className="mt-1 font-medium">
                  Market → ICP → Valuable variable → Pain → Evidence → Opportunity → Mechanism →
                  Proof frontier → Experiment
                </p>
              </div>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              [
                "Product first",
                "Idea → justification instead of market → ICP → variable → problem.",
              ],
              ["Reasoning as proof", "An LLM's confidence is not evidence. Nothing is verified."],
              [
                "No kill switch",
                "Weak ideas never get killed because nothing is scored against a rule.",
              ],
              [
                "No causal chain",
                "If you cannot say how a mechanism moves a variable — and prove each step — you cannot sell it.",
              ],
            ].map(([title, body]) => (
              <li key={title} className="bg-background rounded-lg border p-4">
                <p className="font-medium">{title}</p>
                <p className="text-muted-foreground mt-1">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="method" className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">Opportunity discovery methodology</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          Every conversation moves through the same pipeline and produces a structured artifact, not
          a transcript. Products move valuable variables:{" "}
          <span className="text-foreground">ICP × Variable × Desired movement</span>. Then the value
          causality ladder says how — and the Proof Frontier says how much of it is actually
          supported.
        </p>
        <ol className="mt-8 flex flex-wrap gap-2">
          {PIPELINE.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="bg-background rounded-md border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
              </span>
              {i < PIPELINE.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">
            The AI doesn&apos;t decide what&apos;s true. Evidence does.
          </h2>
          <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            The analyst proposes hypotheses and asks questions. Four independent scores, the
            epistemic status of every claim, the Proof Frontier and the verdict are computed
            deterministically from the evidence you capture. UNKNOWN stays UNKNOWN. And not every
            piece of evidence can prove every claim.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {FOUR_QUESTIONS.map(([title, question]) => (
              <Card key={title}>
                <CardHeader>
                  <CardTitle className="text-base">{title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm leading-relaxed">
                  {question}
                </CardContent>
              </Card>
            ))}
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            High potential with low evidence yields{" "}
            <span className="text-foreground font-medium">RESEARCH</span>, never BUILD. A strong
            problem whose mechanism has never been tested yields{" "}
            <span className="text-foreground font-medium">TEST</span> — an experiment on the first
            unproven causal link.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">
          Not all evidence proves the same thing
        </h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          Evidence isn&apos;t just a source. It has to fit the claim. Every piece of evidence is
          judged against the specific claim it is linked to — admissibility, directness, method,
          independence, scope, sample, recency — and a claim is only as established as its
          best-fitting evidence, within the scope where it was observed.
        </p>
        <div className="mt-6 grid gap-3 text-sm md:grid-cols-4">
          {EVIDENCE_FIT_EXAMPLES.map(([source, proves, cannot]) => (
            <div key={source} className="bg-muted/40 rounded-lg border p-4">
              <p className="text-[10px] font-medium tracking-wider uppercase">{source}</p>
              <p className="mt-1">
                <span className="text-muted-foreground">establishes</span> {proves}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">not {cannot}</p>
            </div>
          ))}
        </div>
        <p className="text-muted-foreground mt-6 text-sm">
          Interviews cannot establish causality. Existing spend is not willingness to pay. A
          before/after change is consistent with an effect, not proof of one. Observed in five
          salons means observed in five salons.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <h2 className="text-2xl font-semibold tracking-tight">From assumption to decision</h2>
        <p className="text-muted-foreground mt-3 max-w-2xl leading-relaxed">
          OpportunityOS doesn&apos;t stop at telling you what to test. It records what happened,
          updates the causal model, and shows exactly how your confidence changed — which claims
          moved, where the Proof Frontier now stands, and what the verdict became. No automatic
          certainty: a result supports, contradicts or stays inconclusive, and keeps its
          limitations.
        </p>
        <ol className="mt-8 flex flex-wrap gap-2">
          {VALIDATION_LOOP.map((step, i) => (
            <li key={step} className="flex items-center gap-2">
              <span className="bg-background rounded-md border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground mr-2 font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {step}
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
              Discovery loop
            </p>
            <p className="mt-1">
              Market → ICP → Valuable variable → Pain → Evidence → Opportunity → Mechanism → Value
              chain → Proof frontier
            </p>
          </div>
          <div className="bg-muted/40 rounded-lg border p-4">
            <p className="text-muted-foreground text-[10px] font-medium tracking-wider uppercase">
              Validation loop
            </p>
            <p className="mt-1">
              Assumption → Experiment → Result → Evidence → Knowledge update → Proof frontier
              movement → Verdict → Next best action
            </p>
          </div>
        </div>
      </section>

      <section id="radar" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Example Opportunity Radar</h2>
          <Badge variant="muted">Example data — illustrative, not measured</Badge>
        </div>
        <div className="mt-6 overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead className="text-right">Potential</TableHead>
                <TableHead className="text-right">Evidence</TableHead>
                <TableHead className="text-right">Value</TableHead>
                <TableHead className="text-right">Causal</TableHead>
                <TableHead>Proof frontier</TableHead>
                <TableHead>Verdict</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {EXAMPLE_RADAR.map((row) => (
                <TableRow key={row.title}>
                  <TableCell className="font-medium">{row.title}</TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.potential}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.evidence}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.value ?? <span className="text-tone-warning text-[10px]">INCOMPLETE</span>}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {row.causal ?? (
                      <span className="text-tone-warning text-[10px]">INCOMPLETE</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">{row.frontier}</TableCell>
                  <TableCell>
                    <Badge variant={VERDICT_TONE[row.verdict]}>{row.verdict}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="text-muted-foreground mt-3 text-xs">
          INCOMPLETE means an input is unknown, not zero. The frontier is where supported knowledge
          currently ends; everything beyond it is a product or causal hypothesis.
        </p>
      </section>

      <section className="bg-muted/40 border-y">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {[
              [
                "Talk",
                "Start from your context or decompose an existing idea. The analyst asks one focused question at a time.",
              ],
              [
                "Structure",
                "Every answer updates a structured model: ICPs, valuable variables, pains, mechanisms and the causal chain from mechanism to value.",
              ],
              [
                "Evidence",
                "Capture quotes, URLs, interviews and notes, and say which claim each one supports or contradicts. Hypotheses and evidence never mix.",
              ],
              [
                "Decide",
                "Deterministic scores, a Proof Frontier and a verdict rule tell you what to ignore, kill, research, interview or test next.",
              ],
            ].map(([title, body], i) => (
              <div key={title} className="bg-background rounded-lg border p-4">
                <p className="text-muted-foreground font-mono text-xs">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <p className="mt-2 font-medium">{title}</p>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Decide what is worth months of your life.
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-xl">
          Open the demo workspace, or start your own discovery. No credit card, no pitch deck, no
          logo generator.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild>
            <Link href={appHref}>Find an opportunity</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href={`${appHref}?intent=validate`}>Validate an idea</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
