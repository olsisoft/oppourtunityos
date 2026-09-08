// @vitest-environment node
import "dotenv/config";
import { describe, expect, it } from "vitest";

/**
 * Integration checks against a migrated + seeded database (npm run db:seed).
 * Skipped when DATABASE_URL is not set or the demo workspace is absent.
 *
 *  - existing workspaces still load through the graph query;
 *  - demo scores, verdicts, statuses and the Proof Frontier are reproducible:
 *    recomputing changes nothing;
 *  - existing evidence keeps its provenance and never becomes a hypothesis;
 *  - the Proof Frontier of the demo is derived from evidence, not declared.
 */
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("demo workspace (integration)", () => {
  it("loads, recomputes identically and keeps epistemic invariants", async () => {
    const { prisma } = await import("@/db/prisma");
    const { getWorkspaceGraph } = await import("@/db/workspaces");
    const { recomputeOpportunity } = await import("@/services/scoring/recompute");
    const { isEvidenceBacked } = await import("@/services/value/epistemic");

    const demo = await prisma.workspace.findFirst({
      where: { isDemo: true, name: { contains: "Beauty Salons" } },
    });
    if (!demo) {
      console.warn("Demo workspace not seeded; skipping.");
      return;
    }
    const before = await getWorkspaceGraph(demo.id);
    expect(before.opportunities.length).toBeGreaterThan(0);

    const snapshot = (g: typeof before) =>
      g.opportunities.map((o) => ({
        title: o.title,
        opportunityScore: o.opportunityScore,
        evidenceScore: o.evidenceScore,
        valueStrength: o.valueStrength,
        causalConfidence: o.causalConfidence,
        proofFrontierRung: o.proofFrontierRung,
        verdict: o.verdict,
        nodes: o.valueChainNodes.map((n) => [n.level, n.status, n.confidence]),
        links: o.causalLinks.map((l) => [l.fromNode.level, l.toNode.level, l.status, l.confidence]),
      }));
    const first = snapshot(before);

    for (const o of before.opportunities) await recomputeOpportunity(o.id);
    const after = await getWorkspaceGraph(demo.id);
    expect(snapshot(after)).toEqual(first);

    // Evidence keeps its provenance: demo origin, never a hypothesis.
    for (const e of after.evidence) {
      expect(e.isDemo).toBe(true);
      expect(["DEMO", "USER_CAPTURED", "INTERVIEW", "RESEARCH_PROVIDER"]).toContain(e.origin);
    }

    // No ladder node is evidence-backed without linked evidence.
    for (const o of after.opportunities) {
      for (const n of o.valueChainNodes) {
        if (isEvidenceBacked(n.status)) {
          expect(n.evidenceLinks.length).toBeGreaterThan(0);
        }
      }
      for (const l of o.causalLinks) {
        if (isEvidenceBacked(l.status)) {
          expect(l.evidenceLinks.length).toBeGreaterThan(0);
        }
      }
    }

    // The no-show demo has evidence for the problem but none on its ladder:
    // the frontier stops at the economic pain, not at a product claim.
    const noShow = after.opportunities.find((o) => o.title === "Salon no-show prevention");
    expect(noShow?.proofFrontierRung).toBe("ECONOMIC_PAIN");
    expect(noShow?.valueStrength).toBeNull(); // population/attributability UNKNOWN → INCOMPLETE
    expect(noShow?.causalConfidence).toBeNull(); // no causal evidence → INCOMPLETE

    // Leakage: the problem is well evidenced; the mechanism is documented only
    // by interviews, a job posting and a forum thread — evidence that exists
    // but does not fit a feasibility claim. The frontier stops at the economic
    // pain and names the fitness gap.
    const leakage = after.opportunities.find(
      (o) => o.title === "Employee revenue leakage detection",
    );
    expect(leakage?.proofFrontierRung).toBe("ECONOMIC_PAIN");
    expect(leakage?.valueStrength).not.toBeNull();
    expect(leakage?.verdict).toBe("TEST");
    const leakageFrontier = leakage?.proofFrontier as unknown as {
      blockedAt: { rung: string; blockers: Array<{ kind: string }> } | null;
      frontierScope: { text: { text: string }; generalization: string | null };
      commercial: {
        highestSupported: string | null;
        rungs: Array<{ claimType: string; status: string }>;
      };
    };
    expect(leakageFrontier.blockedAt?.rung).toBe("MECHANISM");
    expect(leakageFrontier.blockedAt?.blockers.map((b) => b.kind)).toContain("LOW_FIT");
    expect(leakageFrontier.frontierScope.text.text).toMatch(/independent hair salon/);
    const mechanism = leakage?.valueChainNodes.find((n) => n.level === "MECHANISM");
    expect(mechanism?.status).toBe("UNPROVEN");
    expect(mechanism?.generalization).toBe("UNTESTED");
    // Evidence fitness is persisted on every claim link, per claim.
    for (const l of leakage?.claimLinks ?? []) {
      expect(l.fitScore).not.toBeNull();
      expect(l.admissibility).not.toBeNull();
      expect(l.fitVersion).toBeTruthy();
    }
    const interviewOnMechanism = mechanism?.evidenceLinks.find((l) =>
      /12 chairs/.test(l.evidence.sourceTitle),
    );
    expect(interviewOnMechanism?.admissibility).toBe("LOW");
    expect(interviewOnMechanism?.fitScore ?? 100).toBeLessThanOrEqual(39);
    // Commercial ladder: the accountant is existing spend, not willingness to pay.
    expect(leakageFrontier.commercial.highestSupported).not.toBe("ACTUAL_PURCHASE");
    expect(
      leakageFrontier.commercial.rungs.find((r) => r.claimType === "EXISTING_SPEND")?.status,
    ).toBe("SUPPORTED");
    expect(
      ["HYPOTHESIS", "UNPROVEN", "SUPPORTED"].includes(
        leakageFrontier.commercial.rungs.find((r) => r.claimType === "WILLINGNESS_TO_PAY")!.status,
      ),
    ).toBe(true);
    expect(
      leakageFrontier.commercial.rungs.find((r) => r.claimType === "ACTUAL_PURCHASE")?.status,
    ).toBe("HYPOTHESIS");

    // Variable semantics: the direct variable is a Leakage (Reduce is coherent);
    // the parent economic variable is a separate, hypothetical relation.
    const { checkVerbType } = await import("@/services/value/variable-semantics");
    expect(leakage?.variable?.variableType).toBe("Leakage");
    expect(leakage?.variable?.category).toBe("COST");
    expect(
      checkVerbType(leakage!.variable!.desiredDirection, leakage!.variable!.variableType).level,
    ).toBe("ok");
    expect(leakage?.variable?.parent?.name).toMatch(/Net revenue/);

    // Learning history: the second seed pass recorded what linking the
    // interview evidence changed — the mechanism went from HYPOTHESIS to
    // UNPROVEN (low-fit evidence informs it) without moving the frontier.
    const linked = leakage?.knowledgeChanges.find((c) => c.trigger === "EVIDENCE_LINKED");
    expect(linked).toBeTruthy();
    expect(linked?.evidence?.sourceTitle).toMatch(/12 chairs/);
    expect(linked?.previousFrontier).toBe("ECONOMIC_PAIN");
    expect(linked?.newFrontier).toBe("ECONOMIC_PAIN");
    const strengthened = linked?.claimsStrengthened as Array<{ key: string }> | undefined;
    expect(strengthened?.some((d) => d.key === "node:MECHANISM")).toBe(true);

    // The migration kept every existing provenance: no variable lost its record-level
    // provenance and inferred fields stay HYPOTHESIS or UNKNOWN.
    for (const m of after.markets)
      for (const i of m.icps)
        for (const v of i.variables) {
          expect(["USER", "INTERVIEW", "EXTERNAL_EVIDENCE", "AI_HYPOTHESIS", "COMPUTED"]).toContain(
            v.provenance,
          );
          const fp = (v.fieldProvenance ?? {}) as Record<string, string>;
          for (const k of ["variableType", "parentDirection", "scope"]) {
            const value = (v as unknown as Record<string, unknown>)[k];
            if (value)
              expect(["AI_HYPOTHESIS", "USER", "INTERVIEW"]).toContain(fp[k] ?? "AI_HYPOTHESIS");
          }
        }

    // A primary value path exists for opportunities with a ladder.
    expect(
      leakage?.valuePaths.some((p) => p.isPrimary && p.proofFrontier === "ECONOMIC_PAIN"),
    ).toBe(true);

    await prisma.$disconnect();
  });
});
