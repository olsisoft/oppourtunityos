/**
 * Assumption status derived from linked evidence. Deterministic.
 */
import { saturate } from "./evidence-score";

export interface AssumptionEvidenceLink {
  direction: "SUPPORTS" | "CONTRADICTS";
  /** Evidence weight 0–1 (see signalWeight). */
  weight: number;
}

export interface AssumptionStatusResult {
  status: "UNKNOWN" | "SUPPORTED" | "CONTRADICTED";
  /** 0–100 */
  confidence: number;
  supportCount: number;
  contradictCount: number;
}

export function deriveAssumptionStatus(links: AssumptionEvidenceLink[]): AssumptionStatusResult {
  const supports = links.filter((l) => l.direction === "SUPPORTS");
  const contradicts = links.filter((l) => l.direction === "CONTRADICTS");
  const s = supports.reduce((a, l) => a + l.weight, 0);
  const c = contradicts.reduce((a, l) => a + l.weight, 0);

  if (links.length === 0) {
    return { status: "UNKNOWN", confidence: 0, supportCount: 0, contradictCount: 0 };
  }

  const status = c > s ? "CONTRADICTED" : "SUPPORTED";
  const confidence = Math.round(100 * saturate(Math.abs(s - c)));
  return {
    status,
    confidence,
    supportCount: supports.length,
    contradictCount: contradicts.length,
  };
}
