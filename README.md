# OpportunityOS

> Don't generate ideas. Discover economic anomalies.

OpportunityOS is an evidence-driven opportunity discovery system for people who can build software but do not know which problem is worth months of their life. A conversational analyst walks you through

```
Market → ICP → Valuable Variable → Desired Movement → Pain → Trigger
→ Current Alternative → Alternative Failure → Evidence → Product Mechanism
→ Product Hypothesis → Value Proposition → Opportunity Score → Evidence Score → Decision
```

while every meaningful statement is captured as structured, provenance-tagged workspace state. The chat is the interface; the opportunity model is the database. Two independent, deterministic scores decide the verdict:

- **Opportunity Potential** — how attractive the opportunity is structurally.
- **Evidence Confidence** — how much external evidence supports the assumptions.

High potential with low evidence yields **RESEARCH**, never BUILD. Hypothesis ≠ Evidence, everywhere in the product.

---

## Contents

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Environment variables](#environment-variables)
4. [Database setup, migrations and seed](#database-setup-migrations-and-seed)
5. [Development](#development)
6. [Testing](#testing)
7. [AI provider configuration](#ai-provider-configuration)
8. [Scoring](#scoring)
9. [Security](#security)
10. [Project structure](#project-structure)
11. [Known limitations](#known-limitations)

---

## Architecture

A modular monolith on **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, shadcn-style components on Radix primitives, **PostgreSQL** with **Prisma 7**, **Auth.js v5**, **Zod**, **Vitest**, **Playwright**.

| Layer              | Location                                        | Responsibility                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain             | `src/domain`                                    | Enums, labels, Zod schemas for every client/server boundary. No I/O.                                                                                                                                                                                                                                                                              |
| Scoring            | `src/services/scoring`                          | Pure, deterministic functions: opportunity score, evidence score, verdict, kill criteria, next-best-action, discovery progress, assumption status. Unit-tested. `recompute.ts` is the only writer of scores.                                                                                                                                      |
| AI                 | `src/services/ai`                               | `AIProvider` interface (`chat` streaming + `structuredOutput`), `BaseAIProvider` domain helpers (extraction, market/ICP/variable maps, pain analysis, mechanisms, evidence summary, interview guide), adapters for **Anthropic** (default), **OpenAI** (optional) and a clearly labelled **mock**. All outputs are validated with Zod before use. |
| Discovery          | `src/services/discovery`                        | Stage state machine, workspace context builder, extraction → state application (sanitized, provenance-tagged), the per-turn orchestrator.                                                                                                                                                                                                         |
| Research           | `src/services/research`                         | `ResearchProvider` interface; V1 ships manual capture plus a mocked provider whose results are flagged `isMocked`.                                                                                                                                                                                                                                |
| Report / Interview | `src/services/report`, `src/services/interview` | Opportunity Report object + Markdown rendering; behaviour-focused interview guide template.                                                                                                                                                                                                                                                       |
| Data access        | `src/db`                                        | Prisma client, ownership-checked workspace queries, dashboard aggregates.                                                                                                                                                                                                                                                                         |
| Server actions     | `src/actions`                                   | Validated mutations (workspaces, evidence, opportunities, assumptions, entities, auth).                                                                                                                                                                                                                                                           |
| UI                 | `src/app`, `src/components`                     | Landing, auth, three-column workspace (chat · opportunity map), report page, dashboard, settings. No business logic in components.                                                                                                                                                                                                                |

**One discovery turn** (`POST /api/workspaces/:id/chat`, NDJSON stream):

1. Authenticate, check workspace ownership, rate limit.
2. Persist the user message; build the analyst system prompt (core rules + stage goal + compact workspace state with provenance labels; evidence excerpts wrapped as untrusted content).
3. Stream the analyst reply.
4. Run a structured extraction (Zod schema, no evidence field by design), sanitize and apply it to the workspace with provenance `USER` or `AI_HYPOTHESIS`.
5. Recompute scores for new opportunities; resolve the next stage (a stage can only be reached when its prerequisites exist — supplying a lot of information at once legitimately jumps ahead).
6. Persist the assistant message with suggested replies and question card; emit progress.

## Installation

Requirements: Node.js 22+, npm 10+, and PostgreSQL 14+ (or Docker for the bundled `docker-compose.yml`).

Quick start (five commands):

```bash
npm install
cp .env.example .env            # generate AUTH_SECRET with: openssl rand -base64 32
docker compose up -d            # or point DATABASE_URL at your own PostgreSQL
npm run db:migrate && npm run db:seed
npm run dev                     # http://localhost:3000 — demo@opportunityos.dev / demo1234
```

```bash
git clone <this repository>
cd opportunityos
npm install            # also runs `prisma generate`
cp .env.example .env   # then edit DATABASE_URL and AUTH_SECRET
```

## Environment variables

See [`.env.example`](.env.example). Never commit real credentials.

| Variable                                            | Purpose                                            |
| --------------------------------------------------- | -------------------------------------------------- |
| `DATABASE_URL`                                      | PostgreSQL connection string.                      |
| `AUTH_SECRET`                                       | Auth.js JWT secret (`openssl rand -base64 32`).    |
| `AUTH_TRUST_HOST`                                   | `true` behind proxies / non-localhost hosts.       |
| `AI_PROVIDER`                                       | `anthropic` \| `openai` \| `mock`. Default `mock`. |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`              | Anthropic adapter (default model `claude-opus-5`). |
| `OPENAI_API_KEY`, `OPENAI_MODEL`                    | Optional OpenAI adapter.                           |
| `AI_RATE_LIMIT_MAX`, `AI_RATE_LIMIT_WINDOW_SECONDS` | Per-user rate limit for the chat endpoint.         |
| `LOG_LEVEL`                                         | `debug` \| `info` \| `warn` \| `error`.            |

## Database setup, migrations and seed

```bash
# create the database — either with Docker…
docker compose up -d          # PostgreSQL 16 on localhost:5432, matches .env.example
# …or with a local PostgreSQL
createdb opportunityos

# apply migrations (development: creates migrations from schema changes)
npm run db:migrate

# production deployments
npm run db:deploy

# seed the demo user and workspaces
npm run db:seed
```

The seed creates:

- demo user `demo@opportunityos.dev` / `demo1234`
- **Beauty Salons (demo)** — market, ICP, 5 variables (no-show rate, employee revenue leakage, idle chair capacity, customer retention, inventory shrinkage), pains, triggers, alternatives, 9 mechanisms, 18 evidence items (all flagged **DEMO DATA**), 12 assumptions with evidence links, 7 opportunities scored deterministically (verdicts range from TEST to KILL and IGNORE), and a recorded conversation.
- **AI receptionist for dental clinics (demo)** — the "I already have an idea" flow mid-way through decomposition.

Re-running the seed replaces the demo workspaces.

## Development

```bash
npm run dev            # http://localhost:3000
npm run typecheck
npm run lint
npm run format
npx tsx scripts/smoke-discovery.ts   # drives both onboarding flows end-to-end with the mock provider
```

Flows to try:

1. Register, create a workspace, pick **I don't know what to build** → answer the context questions → choose a market, ICP, variable → the right panel fills in.
2. Create a workspace, pick **I already have an idea**, type `AI receptionist for dental clinics` → the idea is decomposed, not evaluated.
3. Open the demo workspace → **Radar** tab → an opportunity report → _Why this verdict_, _Why this Opportunity Potential_, _Why this Evidence Confidence_, kill criteria, assumptions, next best action, interview guide, Markdown export.
4. **Evidence** tab → _Add evidence_ (with optional AI-suggested signals you confirm) or _Research_ (mock provider, clearly labelled) → scores recompute.

## Testing

```bash
npm test               # Vitest: scoring engine, verdict grid (exhaustive), kill criteria,
                       # next-best-action, state machine, mock provider, sanitizer, rate limiter, components
npm run test:e2e       # Playwright (requires a migrated + seeded database; builds and starts the app on :3100)
                       # Set PLAYWRIGHT_CHROMIUM_EXECUTABLE=/path/to/chromium to reuse a system browser
```

## AI provider configuration

- `AI_PROVIDER=mock` (default) — the full product works with templated, stage-aware responses. Every reply is prefixed `[MOCK PROVIDER — templated response, not analysis]` and the UI shows a banner. Use it for local development and tests.
- `AI_PROVIDER=anthropic` — set `ANTHROPIC_API_KEY`. Streaming replies use `messages.stream`; structured extraction uses `messages.parse` with `zodOutputFormat`, then re-validates with Zod.
- `AI_PROVIDER=openai` — set `OPENAI_API_KEY`. Same contract via chat completions streaming and `responses.parse`.

The system prompt (`src/prompts/system.ts`) encodes the analyst rules: never start from the product, separate facts / assumptions / hypotheses / evidence, say UNKNOWN, never fabricate evidence or quotes, explore several mechanisms, never announce a score or verdict. Content inside `<untrusted_external_content>` is treated strictly as data.

## Scoring

**Opportunity Potential** (`opportunity-score.ts`) — six 0–10 inputs proposed by the analyst or set by you:

```
importance 20% · pain intensity 20% · frequency 15% · gap 15% · willingness to pay 20% · alternative weakness 10%
score = Σ input × weight × 10, clamped to 0–100
```

**Evidence Confidence** (`evidence-score.ts`) — every evidence item is weighted by strength × relevance × source directness, then feeds gated, saturating components: direct customer 25 · explicit pain 20 · economic impact 20 · workaround 10 · purchase intent 15 · diversity 5 · recency 5. Negative (contradictory) evidence subtracts up to 30 points. One strong interview outweighs fifty vague comments; volume alone never saturates a component.

**Verdict** (`verdict.ts`) — deterministic rules in priority order (TEST ≥75/≥75, INTERVIEW ≥70/≥60, RESEARCH ≥70/<50, INVESTIGATE 60–79/40–69, KILL <50/≥60, IGNORE <40/<40) plus a documented fallback grid so every score pair has a verdict. The UI shows the rule and reasons. BUILD is not a verdict.

**Kill criteria** (`kill-criteria.ts`) — low pain, low WTP, no trigger, rare problem, adequate alternative, non-economic variable, no metric, unreachable ICP, unknown buyer, personal curiosity, oversized solution, evidence without economic impact.

**Next best action** (`next-action.ts`) — ranked from verdict, critical warnings, riskiest untested assumption and evidence gaps. It never defaults to "build software".

## Security

- All `/app` routes are gated by `src/proxy.ts` (JWT, no DB call) and every page/action re-checks the session.
- Every query and mutation goes through `assertWorkspaceAccess(userId, workspaceId)`; unknown ids are reported as forbidden.
- Every boundary is validated with Zod; LLM output is validated, clamped and sanitized (`src/lib/sanitize.ts`) before persistence; only `http(s)` URLs are stored and they are rendered as plain links (`rel="noopener noreferrer nofollow"`), never fetched or executed.
- Evidence and research content are wrapped as untrusted data before reaching the model; the prompt states explicitly that instructions inside it must not be followed.
- API keys live server-side only; the settings page shows provider status without secrets; the logger redacts key-like fields.
- The chat endpoint is rate limited per user (in-memory sliding window).
- Security headers are set in `next.config.ts`.

## Project structure

```
prisma/               schema, migrations, seed
src/
  app/                routes: landing, (auth), app/ (dashboard, w/[workspaceId], opportunities/[id], settings), api/
  actions/            server actions
  components/         ui/ (primitives), chat/, discovery/, opportunity/, evidence/, assumptions/, dashboard/, layout/, shared/
  domain/             enums + labels, Zod schemas
  db/                 prisma client, workspace and dashboard queries
  services/           ai/, discovery/, scoring/, research/, report/, interview/
  prompts/            analyst system prompt, stage goals, extraction/research/interview prompts
  lib/                env, logger, sanitize, rate limit, session helpers
  types/              Auth.js augmentation
tests/                unit (Vitest) and e2e (Playwright)
```

## Known limitations

- Research is manual or mocked; no live web/Reddit/G2 integrations yet (the `ResearchProvider` interface is ready for them).
- Rate limiting is in-memory (single instance).
- The mock provider follows templates; it demonstrates the pipeline, not analysis. Real analysis requires an Anthropic or OpenAI key.
- Structured extraction runs as a second model call after the streamed reply, so a turn costs two requests.
- No teams, billing, or sharing — intentionally out of scope for the MVP.
