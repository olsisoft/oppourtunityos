import type { EvidenceType } from "@/generated/prisma/enums";
import type { Locale } from "@/i18n/locales";

/**
 * Research abstraction. V1 ships a manual capture path and a clearly labelled
 * mock provider. Future providers (web, Reddit, forums, G2, Capterra, app
 * stores, job boards) implement the same interface; nothing else changes.
 */
export interface ResearchResult {
  id: string;
  providerName: string;
  /** Always true for mocked data so the UI can label it. */
  isMocked: boolean;
  type: EvidenceType;
  title: string;
  url: string | null;
  excerpt: string;
  author: string | null;
  publishedAt: string | null;
  /** Provider's own relevance estimate 0–10; user confirms before import. */
  relevanceHint: number;
}

export interface ResearchQuery {
  query: string;
  /** Free-text hypothesis used to frame relevance. */
  hypothesis?: string;
  limit?: number;
  /** Language of the user; providers that write text (the mock) follow it. */
  locale?: Locale;
}

export interface ResearchProvider {
  readonly name: string;
  readonly isMocked: boolean;
  search(query: ResearchQuery): Promise<ResearchResult[]>;
}
