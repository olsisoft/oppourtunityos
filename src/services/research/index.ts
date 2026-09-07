import { MockResearchProvider } from "./mock-provider";
import type { ResearchProvider } from "./types";

/**
 * V1 only ships the mock provider. Real integrations plug in here without
 * touching the rest of the app.
 */
export function getResearchProvider(): ResearchProvider {
  return new MockResearchProvider();
}

export * from "./types";
