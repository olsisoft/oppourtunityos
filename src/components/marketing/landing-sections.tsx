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

const EXAMPLE_RADAR: Array<{
  title: string;
  potential: number;
  evidence: number;
  verdict: Verdict;
}> = [
  { title: "Employee revenue leakage", potential: 91, evidence: 87, verdict: "TEST" },
  { title: "Appointment no-shows", potential: 88, evidence: 91, verdict: "TEST" },
  { title: "Idle capacity", potential: 86, evidence: 72, verdict: "INTERVIEW" },
  { title: "Inventory shrinkage", potential: 82, evidence: 58, verdict: "RESEARCH" },
  { title: "Dynamic pricing", potential: 71, evidence: 31, verdict: "RESEARCH" },
];

const PIPELINE = [
  "Market",
  "ICP",
  "Valuable variable",
  "Desired movement",
  "Pain",
  "Trigger",
  "Current alternative",
  "Alternative failure",
  "Evidence",
  "Mechanisms",
  "Product hypothesis",
  "Opportunity score",
  "Evidence score",
  "Decision",
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
              ["No metric", "If you cannot name the variable a product moves, you cannot sell it."],
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
          <span className="text-foreground">ICP × Variable × Desired movement</span>.
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
            Opportunity Potential vs Evidence Confidence
          </h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Opportunity Potential</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm leading-relaxed">
                How attractive the opportunity appears structurally. Deterministic weights over
                importance (20%), pain (20%), frequency (15%), gap (15%), willingness to pay (20%)
                and alternative weakness (10%). Inputs are proposed by the analyst and edited by
                you. Never invented by a model.
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evidence Confidence</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm leading-relaxed">
                How much external evidence supports the assumptions. Direct customer statements,
                explicit pain, economic impact, workarounds and purchase intent weigh more than
                volume. Contradictory evidence reduces confidence. One real buyer saying &ldquo;we
                lose $20,000 a month&rdquo; beats fifty vague comments.
              </CardContent>
            </Card>
          </div>
          <p className="text-muted-foreground mt-6 text-sm">
            High potential with low evidence yields{" "}
            <span className="text-foreground font-medium">RESEARCH</span>, never BUILD.
          </p>
        </div>
      </section>

      <section id="radar" className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Example Opportunity Radar</h2>
          <Badge variant="muted">Example data</Badge>
        </div>
        <div className="mt-6 rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Opportunity</TableHead>
                <TableHead className="text-right">Potential</TableHead>
                <TableHead className="text-right">Evidence</TableHead>
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
                  <TableCell>
                    <Badge variant={VERDICT_TONE[row.verdict]}>{row.verdict}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
                "Every answer updates a structured opportunity model: ICPs, variables, pains, triggers, alternatives.",
              ],
              [
                "Evidence",
                "Capture quotes, URLs, interviews and notes. Hypotheses and evidence never mix.",
              ],
              [
                "Decide",
                "Deterministic scores and a verdict rule tell you to ignore, kill, research, investigate, interview or test.",
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
