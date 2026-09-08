import { describe, expect, it } from "vitest";
import { assessClaim } from "@/services/value/epistemic";
import { assessGeneralization, GENERALIZATION_THRESHOLDS } from "@/services/value/generalization";
import { describeScope, mergeScopes, parseScope, scopeMatch } from "@/services/value/scope";
import { claimInputs, item, NOW } from "../support/fit-helpers";

const salon = (n: number, systems: string[] = ["POS A"]) => ({
  population: "independent hair salons",
  systems,
  environment: "founder-assisted",
  organizationCount: n,
  timePeriod: "one month",
});

function obs(
  originId: string,
  scope: ReturnType<typeof salon>,
  direction: "SUPPORTS" | "CONTRADICTS" = "SUPPORTS",
  fitScore = 80,
) {
  return { originId, direction, fitScore, scope, measurement: true };
}

describe("scope", () => {
  it("parses, merges and describes scopes deterministically", () => {
    expect(
      parseScope({ population: " salons ", systems: "POS A, POS B", organizationCount: "5" }),
    ).toEqual({
      population: "salons",
      systems: ["POS A", "POS B"],
      organizationCount: 5,
    });
    expect(parseScope({})).toBeNull();
    const merged = mergeScopes([salon(3, ["POS A"]), salon(2, ["POS B"])]);
    expect(merged?.organizationCount).toBe(5);
    expect(merged?.systems).toEqual(["POS A", "POS B"]);
    expect(merged?.sourceDiversity).toBe(2);
    expect(describeScope(merged)).toMatch(
      /^5 organizations · independent hair salons · 2 configurations/,
    );
  });

  it("compares scopes dimension by dimension and reports mismatches and unknowns", () => {
    const claim = { population: "independent hair salons", geography: "France" };
    expect(scopeMatch(salon(5), claim).status).toBe("PARTIAL");
    expect(scopeMatch(salon(5), claim).unknown).toEqual(["geography"]);
    expect(scopeMatch({ population: "dental clinics" }, claim).status).toBe("MISMATCH");
    expect(scopeMatch(null, claim).status).toBe("EVIDENCE_SCOPE_UNKNOWN");
    expect(scopeMatch(salon(5), null).status).toBe("CLAIM_SCOPE_UNDECLARED");
    expect(
      scopeMatch({ population: "independent hair salons", geography: "France" }, claim).score,
    ).toBe(1);
  });
});

describe("generalization status", () => {
  const claimScope = { population: "independent hair salons" };

  it("one case is CASE_ONLY; several independent cases are SAMPLE_SUPPORTED", () => {
    const one = assessGeneralization([obs("a", salon(1))], claimScope, "the mechanism is feasible");
    expect(one.status).toBe("CASE_ONLY");
    expect(one.nextQuestion?.text).toMatch(/other organizations|still hold/);
    const three = assessGeneralization(
      [obs("a", salon(1)), obs("b", salon(1)), obs("c", salon(1))],
      claimScope,
    );
    expect(three.status).toBe("SAMPLE_SUPPORTED");
    expect(three.independentOrigins).toBe(3);
  });

  it("does not promote to SEGMENT_SUPPORTED without diversity thresholds", () => {
    const sameConfig = Array.from({ length: 6 }, (_, i) => obs(`o${i}`, salon(1, ["POS A"])));
    expect(assessGeneralization(sameConfig, claimScope).status).toBe("SAMPLE_SUPPORTED");
    const diverse = Array.from({ length: 6 }, (_, i) =>
      obs(`o${i}`, salon(1, [i % 2 ? "POS A" : "POS B"])),
    );
    expect(assessGeneralization(diverse, claimScope).status).toBe("SEGMENT_SUPPORTED");
    expect(GENERALIZATION_THRESHOLDS.segmentMinOrigins).toBe(5);
    // Duplicates of one origin are one case.
    const duplicated = Array.from({ length: 6 }, (_, i) =>
      obs("same", salon(1, [i % 2 ? "POS A" : "POS B"])),
    );
    expect(assessGeneralization(duplicated, claimScope).status).toBe("CASE_ONLY");
  });

  it("a broader claim stays a hypothesis when the observed scope does not match it", () => {
    const r = assessGeneralization([obs("a", { ...salon(3), population: "dental clinics" })], {
      population: "independent hair salons",
    });
    expect(r.status).toBe("BROADER_HYPOTHESIS");
    expect(r.gap.text).toMatch(/broader scope/);
  });

  it("contradiction in another context is reported, low-fit observations do not count", () => {
    const r = assessGeneralization(
      [
        obs("a", salon(3, ["POS A"])),
        obs(
          "b",
          { ...salon(2, ["Dentrix"]), population: "dental clinics", environment: "unassisted" },
          "CONTRADICTS",
        ),
      ],
      claimScope,
    );
    expect(r.status).toBe("CONTRADICTED_ACROSS_CONTEXTS");
    const low = assessGeneralization([obs("a", salon(3), "SUPPORTS", 30)], claimScope);
    expect(low.status).toBe("UNTESTED");
  });

  it("OBSERVED means observed within a scope: the claim carries its scope and stays case-only", () => {
    const study = item("DATA_FEASIBILITY_STUDY", {
      organizationCount: 5,
      scope: { ...salon(5, ["POS A", "POS B", "POS C"]) },
      sourceOriginId: "experiment:1",
    });
    const a = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: claimInputs("MECHANISM_FEASIBLE", [{ item: study }], claimScope),
      claimType: "MECHANISM_FEASIBLE",
      claimScope,
      now: NOW,
    });
    expect(a.status).toBe("OBSERVED");
    expect(a.observed).toBe(true);
    expect(a.observedScopeText?.text).toMatch(/5 organizations/);
    expect(a.generalization?.status).toBe("CASE_ONLY");
    expect(a.inference.text).toMatch(/observed within/);
    expect(a.inference.text).toMatch(/One case/);
    // The same claim supported by interviews only is SUPPORTED at most, never OBSERVED.
    const reported = assessClaim({
      hasStatement: true,
      generatedBy: "AI_HYPOTHESIS",
      evidence: claimInputs(
        "PAIN_EXISTS",
        [{ item: item("INTERVIEW") }, { item: item("INTERVIEW") }, { item: item("SURVEY") }],
        claimScope,
      ),
      claimType: "PAIN_EXISTS",
      claimScope,
      now: NOW,
    });
    expect(reported.observed).toBe(false);
    expect(["SUPPORTED", "STRONGLY_SUPPORTED"]).toContain(reported.status);
  });
});
