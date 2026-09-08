import { describe, expect, it } from "vitest";
import {
  computeClaimFits,
  computeEvidenceFit,
  fitFactor,
  FIT_VERSION,
} from "@/services/value/evidence-fit";
import { textOf } from "@/i18n/messages";
import { item, NOW } from "../support/fit-helpers";

describe("Evidence Fitness", () => {
  it("is claim-specific: the same interview fits pain existence, informs causality, and is inadmissible for a purchase", () => {
    const interview = item("INTERVIEW");
    const pain = computeEvidenceFit(interview, { claimType: "PAIN_EXISTS", now: NOW });
    const causal = computeEvidenceFit(interview, {
      claimType: "MECHANISM_CAUSES_CAPABILITY",
      now: NOW,
    });
    const purchase = computeEvidenceFit(interview, { claimType: "ACTUAL_PURCHASE", now: NOW });
    expect(pain.band).toBe("HIGH");
    expect(pain.fitScore).toBeGreaterThanOrEqual(70);
    expect(causal.band).toBe("LOW");
    expect(causal.fitScore).toBeLessThanOrEqual(39);
    expect(purchase.fitScore).toBe(0);
    expect(purchase.band).toBe("NONE");
    expect(purchase.admissibility).toBe("NOT_ADMISSIBLE");
    expect(purchase.summary.text).toBe('Not admissible for "buyers actually bought".');
    expect(purchase.explanation[0].text).toMatch(/^Not admissible: a interview cannot be evidence/);
    expect(pain.version).toBe(FIT_VERSION);
  });

  it("is decomposable and explained: points sum to the score before the cap", () => {
    const fit = computeEvidenceFit(item("TRANSACTION_RECORDS", { organizationCount: 12 }), {
      claimType: "MAGNITUDE",
      now: NOW,
    });
    const sum = fit.dimensions.reduce((s, d) => s + d.points, 0) - fit.limitationsPenalty;
    expect(fit.fitScore).toBe(Math.min(fit.cap, Math.round(sum)));
    expect(fit.dimensions.map((d) => d.key)).toEqual([
      "admissibility",
      "directness",
      "methodQuality",
      "independence",
      "scopeMatch",
      "sampleRelevance",
      "recency",
    ]);
    expect(fit.explanation.length).toBeGreaterThan(5);
    expect(fit.summary.text).toMatch(/fit \(\d+\/100\)/);
    expect(fit.summary.key).toBe("validity.fit.summary.line");
    expect(fit.summary.text.endsWith(`— ${fit.reason.text}.`)).toBe(true);
    expect(fit.explanation[0].text).toBe(
      `Fit ${fit.fitScore}/100 (${fit.band}) for "the magnitude is as stated".`,
    );
    const method = fit.dimensions.find((d) => d.key === "methodQuality")!;
    expect(method.label.text).toBe("Method quality");
    expect(method.note.text).toBe("transaction records baseline 0.9, strength 8/10");
    expect(fit.explanation[3].text).toBe(
      `Method quality: ${Math.round(method.value * 100)}% of ${method.weight} → ${method.points} pts (transaction records baseline 0.9, strength 8/10)`,
    );
    expect(fit.dimensions.find((d) => d.key === "sampleRelevance")?.note.text).toBe(
      "12 organizations",
    );
  });

  it("caps fit by admissibility so low-admissibility evidence can inform but never dominate", () => {
    const forum = computeEvidenceFit(
      item("FORUM_POST", { strengthScore: 10, relevanceScore: 10 }),
      {
        claimType: "MAGNITUDE",
        now: NOW,
      },
    );
    expect(forum.admissibility).toBe("LOW");
    expect(forum.fitScore).toBeLessThanOrEqual(39);
    const interviewWtp = computeEvidenceFit(
      item("INTERVIEW", { strengthScore: 10, relevanceScore: 10 }),
      {
        claimType: "WILLINGNESS_TO_PAY",
        now: NOW,
      },
    );
    expect(interviewWtp.admissibility).toBe("MEDIUM");
    expect(interviewWtp.fitScore).toBeLessThanOrEqual(69);
  });

  it("low scope match caps the contribution", () => {
    const claimScope = { population: "independent hair salons", systems: ["POS A"] };
    const matching = computeEvidenceFit(
      item("BOOKING_DATA", {
        scope: { population: "independent hair salons", systems: ["POS A"] },
      }),
      { claimType: "PAIN_FREQUENCY", claimScope, now: NOW },
    );
    const mismatching = computeEvidenceFit(
      item("BOOKING_DATA", { scope: { population: "dental clinics", systems: ["Dentrix"] } }),
      { claimType: "PAIN_FREQUENCY", claimScope, now: NOW },
    );
    const unknown = computeEvidenceFit(item("BOOKING_DATA"), {
      claimType: "PAIN_FREQUENCY",
      claimScope,
      now: NOW,
    });
    expect(matching.scope.status).toBe("MATCH");
    expect(mismatching.scope.status).toBe("MISMATCH");
    expect(mismatching.fitScore).toBeLessThan(unknown.fitScore);
    expect(unknown.fitScore).toBeLessThan(matching.fitScore);
  });

  it("duplicates of one origin do not add independence; independent origins do", () => {
    const a = item("INTERVIEW", { sourceOriginId: "interview:owner-a" });
    const b = item("INTERVIEW", { sourceOriginId: "interview:owner-a" });
    const c = item("INTERVIEW", { sourceOriginId: "interview:owner-c" });
    const fits = computeClaimFits([a, b, c], { claimType: "PAIN_EXISTS", now: NOW });
    const duplicates = [a, b].map((x) => fits.get(x.id)!).filter((f) => f.duplicateOfOrigin);
    expect(duplicates.length).toBe(1);
    expect(fits.get(c.id)!.duplicateOfOrigin).toBe(false);
    const independent = [a, b].map((x) => fits.get(x.id)!).find((f) => !f.duplicateOfOrigin)!;
    expect(duplicates[0].fitScore).toBeLessThan(independent.fitScore);
    expect(duplicates[0].explanation.map(textOf).join(" ")).toMatch(/already counted/);
  });

  it("weak internal validity and a weak design lower the fit of experimental evidence for causal claims", () => {
    const strong = computeEvidenceFit(
      item("CONTROLLED_EXPERIMENT", {
        designLevel: "CONTROLLED",
        internalValidity: "HIGH",
        organizationCount: 6,
      }),
      { claimType: "CAPABILITY_CAUSES_TRANSFORMATION", now: NOW },
    );
    const weakValidity = computeEvidenceFit(
      item("CONTROLLED_EXPERIMENT", {
        designLevel: "CONTROLLED",
        internalValidity: "LOW",
        organizationCount: 6,
      }),
      { claimType: "CAPABILITY_CAUSES_TRANSFORMATION", now: NOW },
    );
    const beforeAfter = computeEvidenceFit(
      item("BEFORE_AFTER_TEST", {
        designLevel: "BEFORE_AFTER",
        internalValidity: "HIGH",
        organizationCount: 6,
      }),
      { claimType: "CAPABILITY_CAUSES_TRANSFORMATION", now: NOW },
    );
    expect(strong.band).toBe("HIGH");
    expect(weakValidity.fitScore).toBeLessThan(strong.fitScore);
    expect(weakValidity.limitationsPenalty).toBe(8);
    expect(weakValidity.dimensions.find((d) => d.key === "methodQuality")?.note.text).toBe(
      "controlled experiment baseline 0.95, strength 8/10, controlled design ×0.9, internal validity low ×0.45",
    );
    expect(weakValidity.explanation.map(textOf)).toContain(
      "Limitations penalty: −8 (low internal validity (−8))",
    );
    expect(beforeAfter.explanation.map(textOf)).toContain(
      "Capped at 69: medium-admissibility evidence cannot fit better than this for the claim.",
    );
    expect(beforeAfter.fitScore).toBeLessThan(strong.fitScore);
    expect(beforeAfter.admissibility).toBe("MEDIUM");
  });

  it("fit factor: high-fit evidence counts fully, lower fit scales down, inadmissible counts nothing", () => {
    expect(fitFactor(85)).toBe(1);
    expect(fitFactor(70)).toBe(1);
    expect(fitFactor(35)).toBe(0.5);
    expect(fitFactor(0)).toBe(0);
    expect(fitFactor(undefined)).toBe(1);
  });
});
