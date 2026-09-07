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

    // No ladder node is PROVEN or SUPPORTED without linked evidence.
    for (const o of after.opportunities) {
      for (const n of o.valueChainNodes) {
        if (n.status === "PROVEN" || n.status === "SUPPORTED") {
          expect(n.evidenceLinks.length).toBeGreaterThan(0);
        }
      }
      for (const l of o.causalLinks) {
        if (l.status === "PROVEN" || l.status === "SUPPORTED") {
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

    // Leakage: manual reconciliation is documented by evidence, the software
    // capability is blocked by an untested feasibility assumption.
    const leakage = after.opportunities.find(
      (o) => o.title === "Employee revenue leakage detection",
    );
    expect(leakage?.proofFrontierRung).toBe("MECHANISM");
    expect(leakage?.valueStrength).not.toBeNull();
    expect(leakage?.verdict).toBe("TEST");

    await prisma.$disconnect();
  });
});
