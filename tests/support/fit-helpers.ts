/**
 * Test helpers: build claim evidence inputs through the real fitness engine,
 * exactly as the recompute does (fit → weighted signal → assessment).
 */
import type { ClaimType, EvidenceSourceType } from "@/generated/prisma/enums";
import type { EvidenceSignal } from "@/services/scoring/evidence-score";
import type { ClaimEvidenceInput } from "@/services/value/epistemic";
import { computeEvidenceFit, type EvidenceFitInput } from "@/services/value/evidence-fit";
import { isMeasurementSource, legacyTypeForSource } from "@/services/value/evidence-sources";
import type { Scope } from "@/services/value/scope";

export const NOW = new Date("2026-09-01T00:00:00Z");

let counter = 0;

export function item(
  sourceType: EvidenceSourceType,
  overrides: Partial<EvidenceFitInput> & {
    hasEconomicImpact?: boolean;
    hasPurchaseIntent?: boolean;
  } = {},
): EvidenceFitInput & { hasEconomicImpact?: boolean; hasPurchaseIntent?: boolean } {
  counter += 1;
  return {
    id: `e${counter}`,
    sourceType,
    strengthScore: 8,
    relevanceScore: 8,
    isDirectCustomer: sourceType === "INTERVIEW" || sourceType === "SURVEY",
    sourceDate: "2026-06-01",
    ...overrides,
  };
}

export function signalFor(
  fitInput: EvidenceFitInput & { hasEconomicImpact?: boolean; hasPurchaseIntent?: boolean },
  fitScore: number,
  originId: string,
): EvidenceSignal {
  return {
    type: legacyTypeForSource(fitInput.sourceType),
    strengthScore: fitInput.strengthScore,
    relevanceScore: fitInput.relevanceScore,
    sentiment: "POSITIVE",
    sourceDate: fitInput.sourceDate,
    isDirectCustomer: fitInput.isDirectCustomer ?? false,
    hasExplicitPain: true,
    hasEconomicImpact: fitInput.hasEconomicImpact ?? isMeasurementSource(fitInput.sourceType),
    hasWorkaround: false,
    hasPurchaseIntent: fitInput.hasPurchaseIntent ?? false,
    sourceType: fitInput.sourceType,
    fit: fitScore,
    originId,
  };
}

/** Claim inputs for one claim, with independence judged across the set (strongest first). */
export function claimInputs(
  claimType: ClaimType,
  uses: Array<{
    item: EvidenceFitInput & { hasEconomicImpact?: boolean; hasPurchaseIntent?: boolean };
    direction?: "SUPPORTS" | "CONTRADICTS" | "NEUTRAL";
  }>,
  claimScope: Scope | null = null,
): ClaimEvidenceInput[] {
  const order = [...uses].sort(
    (a, b) =>
      b.item.strengthScore * b.item.relevanceScore - a.item.strengthScore * a.item.relevanceScore ||
      a.item.id.localeCompare(b.item.id),
  );
  const seen = new Set<string>();
  const fits = new Map<(typeof uses)[number], ReturnType<typeof computeEvidenceFit>>();
  for (const use of order) {
    const fit = computeEvidenceFit(use.item, {
      claimType,
      claimScope,
      now: NOW,
      priorOrigins: seen,
    });
    seen.add(fit.originId);
    fits.set(use, fit);
  }
  return uses.map((use) => {
    const fit = fits.get(use)!;
    return {
      signal: signalFor(use.item, fit.fitScore, fit.originId),
      direction: use.direction ?? "SUPPORTS",
      fit,
      scope: use.item.scope ?? null,
      originId: fit.originId,
      measurement: isMeasurementSource(use.item.sourceType),
    };
  });
}
