/**
 * Mocked research provider. Returns deterministic, obviously synthetic results
 * so the research → evidence flow can be exercised without web access.
 * Every result is flagged `isMocked: true` and titled "[MOCK]".
 */
import type { ResearchProvider, ResearchQuery, ResearchResult } from "./types";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

export class MockResearchProvider implements ResearchProvider {
  readonly name = "mock-research";
  readonly isMocked = true;

  async search(query: ResearchQuery): Promise<ResearchResult[]> {
    const topic = query.query.trim() || "the problem";
    const seed = hash(topic);
    const limit = Math.min(query.limit ?? 4, 6);
    const templates: Array<Omit<ResearchResult, "id" | "providerName" | "isMocked">> = [
      {
        type: "FORUM_POST",
        title: `[MOCK] Forum thread: "How do you deal with ${topic}?"`,
        url: null,
        excerpt: `[MOCK DATA] Synthetic forum post. An owner describes struggling with ${topic} and tracking it in a spreadsheet. Replace with a real source before trusting it.`,
        author: "mock-user-1",
        publishedAt: new Date(Date.now() - (seed % 200) * 86_400_000).toISOString().slice(0, 10),
        relevanceHint: 5,
      },
      {
        type: "COMPETITOR_REVIEW",
        title: `[MOCK] Competitor review mentioning ${topic}`,
        url: null,
        excerpt: `[MOCK DATA] Synthetic review: "The tool helps a bit with ${topic} but we still lose money every month." No real product is referenced.`,
        author: "mock-reviewer",
        publishedAt: new Date(Date.now() - ((seed >> 3) % 300) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 6,
      },
      {
        type: "JOB_POSTING",
        title: `[MOCK] Job posting: coordinator responsible for ${topic}`,
        url: null,
        excerpt: `[MOCK DATA] Synthetic posting for a role whose duties include handling ${topic}. Signals a workaround via labour, if real.`,
        author: null,
        publishedAt: new Date(Date.now() - ((seed >> 5) % 90) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 4,
      },
      {
        type: "REDDIT",
        title: `[MOCK] Reddit comment contradicting the hypothesis about ${topic}`,
        url: null,
        excerpt: `[MOCK DATA] Synthetic comment: "Honestly ${topic} is not a big deal for us, the reminders we already send are fine." Contradictory signal example.`,
        author: "mock-redditor",
        publishedAt: new Date(Date.now() - ((seed >> 7) % 400) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 4,
      },
      {
        type: "MARKET_REPORT",
        title: `[MOCK] Industry note on ${topic}`,
        url: null,
        excerpt: `[MOCK DATA] Synthetic market note. Contains no real statistics on purpose. Use it only to test the evidence workflow.`,
        author: null,
        publishedAt: null,
        relevanceHint: 3,
      },
    ];
    return templates.slice(0, limit).map((t, i) => ({
      ...t,
      id: `mock-${seed}-${i}`,
      providerName: this.name,
      isMocked: true,
    }));
  }
}
