# OpportunityOS

> Don't generate ideas. Discover economic anomalies.

OpportunityOS is an evidence-driven opportunity discovery system for people who can build software but do not know which problem is worth months of their life. A conversational analyst walks you through

```
Market → ICP → Valuable Variable → Desired Movement → Pain → Trigger
→ Current Alternative → Alternative Failure → Evidence → Product Mechanism
→ Product Hypothesis → Value Proposition → Opportunity Score → Evidence Score → Decision
```

while every meaningful statement is captured as structured, provenance-tagged workspace state. The chat is the interface; the opportunity model is the database.

The intellectual core is the chain **ICP → Valuable Variable → Pain → Desired Movement → Opportunity → Mechanism → Causal Chain → Proof Frontier → Experiment**. Four independent, deterministic scores and one deterministic verdict answer four different questions:

- **Opportunity Potential** — is the problem structurally attractive?
- **Evidence Confidence** — do we have credible evidence that the problem is real?
- **Value Strength** — if we move the variable, how much value could be created?
- **Causal Confidence** — do we know that the proposed mechanism can actually move it?

High potential with low evidence yields **RESEARCH**, never BUILD. The **Proof Frontier** marks where supported knowledge ends; everything beyond it is a product or causal hypothesis. The AI doesn't decide what's true. Evidence does. UNKNOWN stays UNKNOWN.

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
9. [Value engineering](#value-engineering)
10. [Security](#security)
11. [Project structure](#project-structure)
12. [Known limitations](#known-limitations)

---

## Architecture

A modular monolith on **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS v4**, shadcn-style components on Radix primitives, **PostgreSQL** with **Prisma 7**, **Auth.js v5**, **Zod**, **Vitest**, **Playwright**.

| Layer              | Location                                        | Responsibility                                                                                                                                                                                                                                                                                                                                    |
| ------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain             | `src/domain`                                    | Enums, labels, Zod schemas for every client/server boundary. No I/O.                                                                                                                                                                                                                                                                              |
| Scoring            | `src/services/scoring`                          | Pure, deterministic functions: opportunity score, evidence score, verdict, kill criteria, next-best-action, discovery progress, assumption status. Unit-tested. `recompute.ts` is the only writer of scores, statuses and the Proof Frontier.                                                                                                     |
| Value              | `src/services/value`                            | Pure epistemic engine: claim assessment (PROVEN / SUPPORTED / HYPOTHESIS / UNPROVEN / CONTRADICTED / UNKNOWN), Proof Frontier, Value Strength, Causal Confidence, verdict extension rules, value-oriented next best action, variable semantics (verb × category checks, per-field provenance).                                                    |
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
                       # next-best-action, state machine, mock provider, sanitizer, rate limiter, components,
                       # epistemic engine, proof frontier, value strength, causal confidence, verdict extension,
                       # epistemic guards (the AI can never emit evidence, statuses, scores or a frontier).
                       # tests/integration runs against DATABASE_URL when set: existing workspaces load,
                       # demo scores/frontier are reproducible, evidence keeps its provenance.
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

**Next best action** (`next-action.ts`) — ranked from verdict, critical warnings, riskiest untested assumption and evidence gaps. It never defaults to "build software". Once an opportunity has a value chain, the value-engineering action (`src/services/value/next-value-action.ts`) leads.

## Value engineering

OpportunityOS is also a rigorous value-engineering instrument. Everything below is deterministic; the analyst can propose statements but never statuses, scores or the frontier.

**Valuable Variable** — a first-class entity: action verb × variable × target, current state, desired state, unit, importance, who values it, why it matters, parent economic variable. Every field carries its own provenance (USER / INTERVIEW / EVIDENCE / HYPOTHESIS / UNKNOWN); empty fields stay UNKNOWN. Verb × category contradictions (e.g. _Increase_ × _Cost_) are flagged.

**Value Causality Ladder** — `Mechanism → Capability → Transformation → Operational Value → Economic Value → Strategic Outcome (→ Business Outcome)`. Each node is a claim with an epistemic status; each arrow is a `CausalLink`, a testable assumption with a criticality. Causal distance CD0–CD5 makes attribution difficulty explicit.

**Epistemic status** (`epistemic.ts`) — computed from the evidence linked to a claim, weighted by its fitness for _that_ claim: SUPPORTED ≥ 40; STRONGLY_SUPPORTED ≥ 75 with at least two independent origins; OBSERVED when a high-fit measurement (records, behaviour, experiment) supports it — within a defined scope only; MIXED when high-fit evidence both supports and contradicts; CONTRADICTED when contradiction outweighs support or a critical assumption is contradicted; UNPROVEN when stated but not sufficiently supported; HYPOTHESIS when an AI statement has no admissible evidence; UNKNOWN when nothing is stated. The legacy PROVEN status was migrated to OBSERVED (measurements) or STRONGLY_SUPPORTED; the audit trail keeps the original strings.

**Proof Frontier** (`proof-frontier.ts`) — the last contiguous rung (variable importance → pain → economic pain → mechanism → … → strategic outcome) whose claim is supported, whose critical links before it are supported, with no unresolved contradiction and no completely untested critical assumption on the path. It can never jump over an unsupported link.

**Value Strength** (`value-strength.ts`) — geometric mean of importance, magnitude, frequency, population and attributability (0–10 each) × 100. Any missing dimension → `INCOMPLETE`, never an estimate.

**Causal Confidence** (`causal-confidence.ts`) — the weakest critical link of `Mechanism → Capability → Transformation → Operational → Economic`. A missing link or a critical link with zero evidence → `INCOMPLETE`. Contradicted links are capped.

**Verdict extension** (`verdict-extension.ts`) — the original rules are unchanged; documented extra rules apply only when the extra scores exist: strong evidence with low value strength → KILL; contradicted critical link → INVESTIGATE; strong problem evidence with low causal confidence → TEST the mechanism (an experiment on the first unproven link).

**Evidence → claims** — one evidence item may support, contradict or be neutral about several typed claims (`claim-taxonomy.ts`: market, problem, value, product/mechanism, causal, commercial and access claims; value chain nodes and causal links carry the claim type of their level). Linking never converts evidence into proof; recompute computes the fit of each item for each claim and interprets it.

**Assumptions** are typed — CAUSAL, VALUE, FEASIBILITY, WTP, ACCESS, GENERIC — and can be attached to a node or a link. **Experiments** test one link or one collapse-level assumption; results become evidence only when captured as evidence.

**Backward compatibility** — the migration copies each pain's current/desired state into its variable with the pain's provenance and leaves every other new field UNKNOWN; nothing inferred is promoted to evidence. Opportunities without value dimensions or a ladder keep their original scores and verdicts; the extension rules never fire on `INCOMPLETE` inputs.

### The validation loop

OpportunityOS learns from what you test. Two loops share one model:

```
DISCOVERY   Market → ICP → Valuable Variable → Pain → Evidence → Opportunity → Mechanism → Value Chain → Proof Frontier
VALIDATION  Assumption → Experiment → Result → Evidence → Knowledge update → Proof Frontier movement → Verdict → Next Best Action
```

**Variable semantics** (`variable-semantics.ts`) — the compatibility check runs on _action verb × variable type_ (what is directly moved: Leakage, Churn, Downtime, Revenue…), never on the parent economic category. "Reduce × Leakage" is coherent; "Reduce × Revenue" warns. The taxonomy is open: custom types get an explicit polarity or stay UNKNOWN (no warning). The **parent economic variable** (leakage ↓ → net revenue ↑) is a separate relation whose status stays a hypothesis until evidence supports it.

**INCOMPLETE is explanatory** — Value Strength reports `INCOMPLETE · 4/5`, the missing dimension, the provenance of each known dimension and the next value question. Causal Confidence reports `INCOMPLETE · 2/5 critical links validated`, the blocking link and the next causal question. The Proof Frontier states why it stops (confidence vs. required threshold, untested critical assumption, contradiction, missing link). Thresholds rise with causal distance: 40 for problem and product claims, 50 for operational, 60 for economic and strategic consequences. UNKNOWN never becomes zero.

**Experiments** (`Experiment`, `ExperimentResult`) — every experiment targets an assumption, a causal link or a level and must state the decision it makes easier (a missing decision question is flagged). With success and failure thresholds, the observed value decides SUPPORTED / CONTRADICTED / INCONCLUSIVE deterministically (`experiment-outcome.ts`); otherwise you classify explicitly or it stays INCONCLUSIVE. A result becomes an Evidence item of type `EXPERIMENT` that keeps methodology, sample size, observed metric and limitations; INVALID runs produce no evidence; INCONCLUSIVE results are neutral, never support.

**Knowledge changes** (`knowledge-change.ts`, `KnowledgeChange`) — every recompute that moves a claim, a score, the frontier or the verdict records what changed and why (experiment, evidence, assumption). The report shows the **learning history**; the dashboard shows **recent learning** and **stalled learning** (no completed experiment in 21 days with critical assumptions still UNKNOWN); the radar flags a frontier that moved recently.

**Next Best Action** ranks actions with a deterministic ordinal score — decision impact, uncertainty reduction, frontier movement and criticality against effort, time and cost taken from a planned experiment (assumed and flagged otherwise) — and says why this test now. **Value paths** (`ValuePath`) prepare the model for several ways one opportunity creates value; one primary path per opportunity is maintained today.

### Evidence fitness, experimental validity and scope of generalization

_Do we have the **right** evidence for the claim we are trying to make?_ Evidence existence never implies evidence fitness. Every rule below is centralized, deterministic and versioned (`ADMISSIBILITY_VERSION`, `FIT_VERSION`); the UI reads it and the model cannot override it.

**Source taxonomy** (`evidence-sources.ts`) — every evidence item has an `EvidenceSourceType` grouped into families: self-reported (interview, survey, quote, forum, Reddit, sales conversation), behavioral (observed workflow, product usage, clickstream, purchase behaviour, CRM), operational (transaction / financial records, logs, booking, POS, ERP, support, time tracking), market (competitor review, pricing page, job posting, public financials, industry report, government data, market dataset), experimental (prototype, concierge, before/after, matched comparison, controlled, A/B, randomized, pricing, landing page), technical (spike, benchmark, data feasibility, integration test, load test) and commercial (LOI, paid pilot, contract, invoice, subscription, renewal, expansion). `sourceOriginId` records lineage: derivatives of one interview or dataset count once.

**Admissibility matrix** (`admissibility.ts`) — `[source type × claim type] → HIGH | MEDIUM | LOW | NOT_ADMISSIBLE`, written per claim as a default, a level per family and per-source overrides; the resolution path is returned with every judgement. Interviews are HIGH for _pain exists_ and LOW for causality; operational records are HIGH for magnitude and frequency, forums LOW; feasibility is HIGH for technical work and NOT_ADMISSIBLE for forums; causality is HIGH only for controlled / randomized designs (matched and before/after MEDIUM, interviews LOW, technical work NOT_ADMISSIBLE); willingness to pay is HIGH for pricing experiments and paid pilots, MEDIUM for stated amounts in interviews, LOW for surveys; an actual purchase is HIGH for transactions and contracts and NOT_ADMISSIBLE for interviews.

**Evidence fitness** (`evidence-fit.ts`) — per evidence × claim: admissibility, directness, method quality (source baseline × strength, × design level and internal validity for causal claims), source independence, scope match, sample relevance and recency, weighted by the nature of the claim (existence, quantitative, outcome, causal, behavioral), minus a limitations penalty, capped by admissibility (LOW ≤ 39, MEDIUM ≤ 69). The fit is persisted on every evidence → claim link with its decomposition and explanation. In a claim assessment, high-fit evidence counts fully, lower fit scales the weight down, inadmissible evidence counts nothing, and low-fit evidence alone can never lift confidence past 39: it informs, it never dominates. Ten low-fit Reddit posts do not outrank three operational datasets.

**Experimental validity** (`experimental-validity.ts`) — design levels ANECDOTAL < OBSERVATIONAL < BEFORE_AFTER < MATCHED_COMPARISON < CONTROLLED < RANDOMIZED. The facts recorded about a run (baseline, comparison group, assignment, same measurement, isolation, confounders, attrition, instrumentation, sample, duration, completeness, contamination, seasonality, concurrent changes) cap the declared design and yield an internal validity of HIGH / MEDIUM / LOW / INDETERMINATE with ✓ / ⚠ reasons. The plan dialog previews _what this design can prove_ for its target claim; the result stores the effective design, the validity and a system-generated interpretation. Causal Confidence is capped by the strongest design on a link (anecdotal 30, observational 45, before/after 60, matched 75, controlled 90); interview-only evidence cannot carry a causal link.

**Language gate** (`language-gate.ts`) — the wording follows the design and its validity, never the outcome: _customers report_ (anecdotal), _is associated with_ (observational), _changed after … consistent with_ (before/after), _improved more than the comparison group … supports a causal effect_ (matched), _the experiment supports the conclusion that_ (controlled), _caused … within the tested population_ (randomized with validity). Every sentence ends with the scope; nothing generalizes automatically.

**Scope and generalization** (`scope.ts`, `generalization.ts`) — evidence and results carry a `ValidityScope` (population, ICP, geography, industry, size, systems, workflow, environment, period, sample, organizations, conditions); claims carry a `ClaimScope` (defaulting to the ICP). Scope match is compared dimension by dimension and caps the contribution. A claim's generalization status is UNTESTED, CASE_ONLY (one independent origin), SAMPLE_SUPPORTED (several), SEGMENT_SUPPORTED (≥ 5 independent origins across ≥ 2 recorded configurations within the claim's scope), BROADER_HYPOTHESIS (observed in a narrower scope than the claim) or CONTRADICTED_ACROSS_CONTEXTS. There is no automatic promotion; the generalization gap and the next generalization question feed the Next Best Action.

**Proof Frontier** now requires, at each rung, admissible evidence whose best fit reaches the rung's fitness threshold (40 / 55 / 60), the confidence threshold, the required design level on causal links into value rungs (before/after for transformation and operational value, matched comparison for economic and strategic value, controlled for business outcomes), no high-fit contradiction and no contradiction across contexts. The frontier has a **level and a scope**: what was reached, and where it was observed. The **commercial ladder** (`commercial-ladder.ts`) keeps EXISTING_SPEND → PURCHASE_INTENT → WILLINGNESS_TO_PAY → PRICE_ACCEPTANCE → ACTUAL_PURCHASE as separate claims: paying an accountant is existing spend, not willingness to pay; stated willingness is not a purchase.

**Non-negotiable rules** encoded and tested: evidence existence ≠ fitness; fitness is claim-specific; interviews cannot establish causality alone; existing spend ≠ WTP; stated WTP ≠ purchase; before/after ≠ causality; correlation never becomes causal language; OBSERVED means observed within a scope; a sample is not the market; generalization needs scope-compatible evidence; the AI cannot override admissibility or promote evidence quality; UNKNOWN stays UNKNOWN; inconclusive stays inconclusive; low-fit evidence informs but never dominates; duplicates of one source count once; strong contradictions are never averaged away; the frontier moves on appropriate evidence, not quantity; causal claims need methodological evidence; every inference is inspectable.

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
  components/         ui/ (primitives), chat/, discovery/, opportunity/, evidence/, assumptions/, value/ (ladder, scorecard,
                      value panel, node sheet, value strength editor, experiments), dashboard/, layout/, shared/
  domain/             enums + labels, Zod schemas
  db/                 prisma client, workspace and dashboard queries
  services/           ai/, discovery/, scoring/, value/ (epistemic engine), research/, report/, interview/
  prompts/            analyst system prompt, stage goals, extraction/research/interview prompts
  lib/                env, logger, sanitize, rate limit, session helpers
  types/              Auth.js augmentation
tests/                unit (Vitest), integration (Vitest + DATABASE_URL) and e2e (Playwright)
```

## Known limitations

- Research is manual or mocked; no live web/Reddit/G2 integrations yet (the `ResearchProvider` interface is ready for them).
- Rate limiting is in-memory (single instance).
- The mock provider follows templates; it demonstrates the pipeline, not analysis. Real analysis requires an Anthropic or OpenAI key.
- Structured extraction runs as a second model call after the streamed reply, so a turn costs two requests.
- No teams, billing, or sharing — intentionally out of scope for the MVP.
