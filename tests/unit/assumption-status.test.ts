import { describe, expect, it } from "vitest";
import { deriveAssumptionStatus } from "@/services/scoring/assumption-status";

describe("deriveAssumptionStatus", () => {
  it("is UNKNOWN with no links", () => {
    expect(deriveAssumptionStatus([])).toMatchObject({ status: "UNKNOWN", confidence: 0 });
  });
  it("is SUPPORTED when support outweighs contradiction", () => {
    const r = deriveAssumptionStatus([
      { direction: "SUPPORTS", weight: 0.8 },
      { direction: "CONTRADICTS", weight: 0.2 },
    ]);
    expect(r.status).toBe("SUPPORTED");
    expect(r.confidence).toBeGreaterThan(0);
  });
  it("is CONTRADICTED when contradiction outweighs support", () => {
    const r = deriveAssumptionStatus([
      { direction: "SUPPORTS", weight: 0.1 },
      { direction: "CONTRADICTS", weight: 0.9 },
    ]);
    expect(r.status).toBe("CONTRADICTED");
  });
});
