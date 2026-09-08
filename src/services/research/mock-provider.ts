/**
 * Mocked research provider. Returns deterministic, obviously synthetic results
 * so the research → evidence flow can be exercised without web access.
 * Every result is flagged `isMocked: true` and titled "[MOCK]" (French:
 * « [SIMULÉ] »); the texts live under "mock.research" in the dictionaries and
 * follow `query.locale`.
 */
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { renderKey } from "@/i18n/messages";
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
    const locale: Locale = query.locale ?? DEFAULT_LOCALE;
    const text = (kind: string, field: "title" | "excerpt", topic: string) =>
      renderKey(locale, `mock.research.${kind}.${field}`, { topic });
    const topic = query.query.trim() || renderKey(locale, "mock.fallback.problem");
    const seed = hash(topic);
    const limit = Math.min(query.limit ?? 4, 6);
    const templates: Array<Omit<ResearchResult, "id" | "providerName" | "isMocked">> = [
      {
        type: "FORUM_POST",
        title: text("forum", "title", topic),
        url: null,
        excerpt: text("forum", "excerpt", topic),
        author: "mock-user-1",
        publishedAt: new Date(Date.now() - (seed % 200) * 86_400_000).toISOString().slice(0, 10),
        relevanceHint: 5,
      },
      {
        type: "COMPETITOR_REVIEW",
        title: text("review", "title", topic),
        url: null,
        excerpt: text("review", "excerpt", topic),
        author: "mock-reviewer",
        publishedAt: new Date(Date.now() - ((seed >> 3) % 300) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 6,
      },
      {
        type: "JOB_POSTING",
        title: text("job", "title", topic),
        url: null,
        excerpt: text("job", "excerpt", topic),
        author: null,
        publishedAt: new Date(Date.now() - ((seed >> 5) % 90) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 4,
      },
      {
        type: "REDDIT",
        title: text("reddit", "title", topic),
        url: null,
        excerpt: text("reddit", "excerpt", topic),
        author: "mock-redditor",
        publishedAt: new Date(Date.now() - ((seed >> 7) % 400) * 86_400_000)
          .toISOString()
          .slice(0, 10),
        relevanceHint: 4,
      },
      {
        type: "MARKET_REPORT",
        title: text("report", "title", topic),
        url: null,
        excerpt: text("report", "excerpt", topic),
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
