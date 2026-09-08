import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  DiscoveryExtractionSchema,
  ValueChainNodeDraftSchema,
  CausalLinkDraftSchema,
  ValueDimensionsDraftSchema,
} from "@/services/ai/schemas";
import { buildMockTurn } from "@/services/ai/providers/mock";
import type { TurnHints } from "@/services/ai/types";
import { assessClaim } from "@/services/value/epistemic";
import { cleanNullableScore } from "@/services/discovery/clean-score";

/**
 * Epistemic guards: the AI layer can propose hypotheses but can never
 * produce evidence, statuses, scores, verdicts or a proof frontier.
 * These tests pin the contract at the schema boundary, in the mock provider
 * and (statically) in the apply layer.
 */

function hints(overrides: Partial<TurnHints> = {}): TurnHints {
  return {
    workspaceName: "Test",
    stage: "MECHANISM_DISCOVERY",
    entryMode: "NO_IDEA",
    ideaStatement: null,
    userMessage: "Risk prediction",
    turnIndex: 4,
    counts: {
      userContextCaptured: true,
      markets: 1,
      icps: 1,
      variables: 2,
      pains: 1,
      triggers: 1,
      alternatives: 1,
      evidence: 0,
      mechanisms: 1,
      opportunities: 0,
      scoredOpportunities: 0,
    },
    userContext: null,
    existing: {
      markets: ["Beauty salons"],
      icps: ["Independent salon owner"],
      variables: ["No-show rate"],
      pains: ["No-shows leave chairs empty"],
      mechanisms: ["Risk prediction"],
      opportunities: [],
    },
    ...overrides,
  };
}

const FORBIDDEN_TOP_LEVEL_KEYS = [
  "evidence",
  "evidenceScore",
  "opportunityScore",
  "valueStrength",
  "causalConfidence",
  "proofFrontier",
  "verdict",
];

describe("epistemic guards — schema boundary", () => {
  it("the extraction schema has no evidence, score, verdict or frontier keys", () => {
    const keys = Object.keys(DiscoveryExtractionSchema.shape);
    for (const k of FORBIDDEN_TOP_LEVEL_KEYS) expect(keys).not.toContain(k);
    expect(Object.keys(ValueChainNodeDraftSchema.shape)).not.toContain("status");
    expect(Object.keys(ValueChainNodeDraftSchema.shape)).not.toContain("confidence");
    expect(Object.keys(CausalLinkDraftSchema.shape)).not.toContain("status");
    expect(Object.keys(ValueDimensionsDraftSchema.shape)).not.toContain("score");
  });

  it("strips unknown keys a model might smuggle in (evidence, PROVEN status, verdict)", () => {
    const base = buildMockTurn(hints()).extraction;
    const polluted = {
      ...base,
      evidence: [{ title: "Fake study", strengthScore: 90 }],
      verdict: "BUILD",
      proofFrontier: "ECONOMIC_VALUE",
      valueChains: base.valueChains.map((c) => ({
        ...c,
        nodes: c.nodes.map((n) => ({ ...n, status: "PROVEN", confidence: 99 })),
        links: c.links.map((l) => ({ ...l, status: "PROVEN" })),
      })),
    };
    const parsed = DiscoveryExtractionSchema.parse(polluted);
    const json = JSON.stringify(parsed);
    expect(json).not.toMatch(/"evidence"/);
    expect(json).not.toMatch(/"verdict"/);
    expect(json).not.toMatch(/"proofFrontier"/);
    expect(json).not.toMatch(/"status"/);
    expect(json).not.toMatch(/PROVEN/);
    expect(json).not.toMatch(/"confidence"/);
  });

  it("value dimensions accept null (UNKNOWN); the apply layer clamps estimates to 0–10 and keeps null", () => {
    const ok = ValueDimensionsDraftSchema.safeParse({
      opportunityTitle: "x",
      importance: 7,
      magnitude: null,
      frequency: null,
      population: null,
      attributability: null,
      justification: null,
      userStatedDimensions: [],
    });
    expect(ok.success).toBe(true);
    expect(cleanNullableScore(null)).toBeNull();
    expect(cleanNullableScore(undefined)).toBeNull();
    expect(cleanNullableScore(Number.NaN)).toBeNull();
    expect(cleanNullableScore(11)).toBe(10);
    expect(cleanNullableScore(-3)).toBe(0);
    expect(cleanNullableScore(6.6)).toBe(7);
  });
});

describe("epistemic guards — mock provider", () => {
  it("never invents current/desired states for variables: unknown stays null", () => {
    const { extraction } = buildMockTurn(
      hints({ stage: "VARIABLE_DISCOVERY", userMessage: "Owners" }),
    );
    for (const v of extraction.variables) {
      expect(v.currentState).toBeNull();
      expect(v.desiredState).toBeNull();
      expect(v.userStatedFields).toEqual([]);
    }
  });

  it("proposes a value chain whose dimensions are UNKNOWN unless stated, and whose links are testable", () => {
    const { extraction } = buildMockTurn(hints());
    expect(extraction.valueChains).toHaveLength(1);
    const chain = extraction.valueChains[0];
    expect(chain.nodes.map((n) => n.level)).toEqual([
      "MECHANISM",
      "CAPABILITY",
      "TRANSFORMATION",
      "OPERATIONAL_VALUE",
      "ECONOMIC_VALUE",
      "STRATEGIC_OUTCOME",
    ]);
    // every link is a full sentence (a testable assumption), never empty
    for (const link of chain.links) {
      expect(link.statement.length).toBeGreaterThan(20);
      expect(["CRITICAL", "IMPORTANT", "MINOR"]).toContain(link.criticality);
    }
    const dims = extraction.valueDimensions[0];
    expect(dims.magnitude).toBeNull();
    expect(dims.frequency).toBeNull();
    expect(dims.population).toBeNull();
    expect(dims.attributability).toBeNull();
    expect(dims.userStatedDimensions).toEqual([]);
    // no numbers pretending to be measurements
    expect(dims.justification ?? "").toMatch(/UNKNOWN/);
  });

  it("emits typed assumptions linked to causal links, and never a proof frontier", () => {
    const { extraction, reply } = buildMockTurn(hints());
    const kinds = new Set(extraction.assumptions.map((a) => a.kind));
    expect(kinds.has("CAUSAL")).toBe(true);
    expect(kinds.has("VALUE")).toBe(true);
    const causal = extraction.assumptions.find((a) => a.kind === "CAUSAL");
    expect(causal?.linkedCausalLink).toEqual({
      fromLevel: "CAPABILITY",
      toLevel: "TRANSFORMATION",
    });
    expect(JSON.stringify(extraction)).not.toMatch(/"proofFrontier"|"frontier"|"frontierRung"/);
    expect(reply).not.toMatch(/\bPROVEN\b/);
  });
});

describe("epistemic guards — apply layer (static contract)", () => {
  const src = readFileSync(
    resolve(process.cwd(), "src/services/discovery/apply-extraction.ts"),
    "utf8",
  );

  it("never creates evidence and never writes PROVEN or SUPPORTED statuses", () => {
    expect(src).not.toMatch(/evidence\.create/);
    expect(src).not.toMatch(/"PROVEN"/);
    expect(src).not.toMatch(/"SUPPORTED"/);
    // every created node/link starts as a hypothesis
    const statusWrites = src.match(/status:\s*"[A-Z_]+"/g) ?? [];
    expect(statusWrites.length).toBeGreaterThan(0);
    for (const w of statusWrites) expect(w).toBe('status: "HYPOTHESIS"');
  });

  it("never sets generatedBy to EXTERNAL_EVIDENCE or INTERVIEW", () => {
    expect(src).not.toMatch(/generatedBy:\s*"EXTERNAL_EVIDENCE"/);
    expect(src).not.toMatch(/generatedBy:\s*"INTERVIEW"/);
  });
});

describe("epistemic guards — deterministic engine", () => {
  it("a statement with no evidence can never be PROVEN, whatever the generator says", () => {
    const ai = assessClaim({ hasStatement: true, generatedBy: "AI_HYPOTHESIS", evidence: [] });
    expect(ai.status).toBe("HYPOTHESIS");
    const user = assessClaim({ hasStatement: true, generatedBy: "USER", evidence: [] });
    expect(user.status).toBe("UNPROVEN");
    expect(ai.confidence).toBe(0);
  });
});
