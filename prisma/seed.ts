/**
 * Demo seed: a complete "Beauty Salons" discovery workspace plus a small
 * "I already have an idea" workspace. All seeded evidence is flagged
 * isDemo = true and labelled "(demo)" so it is never mistaken for research.
 *
 * Run: npm run db:seed   (idempotent — re-creates the demo workspaces)
 */
import "dotenv/config";
import bcrypt from "bcryptjs";

import { prisma } from "@/db/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  Criticality,
  EvidenceLinkDirection,
  Provenance,
  ValueChainLevel,
} from "@/generated/prisma/enums";
import { deriveAssumptionStatus } from "@/services/scoring/assumption-status";
import { CAUSAL_DISTANCE_BY_LEVEL } from "@/services/value/epistemic";
import { signalWeight } from "@/services/scoring/evidence-score";
import { recomputeOpportunity, toEvidenceSignal } from "@/services/scoring/recompute";

const DEMO_EMAIL = "demo@opportunityos.dev";
const DEMO_PASSWORD = "demo1234";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, name: "Demo User" },
    create: { email: DEMO_EMAIL, name: "Demo User", passwordHash },
  });

  // Idempotent: remove previous demo workspaces for this user.
  await prisma.workspace.deleteMany({ where: { userId: user.id, isDemo: true } });

  await seedBeautySalons(user.id);
  await seedDentalIdea(user.id);

  console.log(`Seeded demo data for ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

async function seedBeautySalons(userId: string) {
  const workspace = await prisma.workspace.create({
    data: {
      userId,
      name: "Beauty Salons (demo)",
      description:
        "Demo workspace. Owner-operated beauty salons with 5–20 employees. Everything here is illustrative; evidence is marked DEMO DATA.",
      entryMode: "NO_IDEA",
      isDemo: true,
    },
  });

  const market = await prisma.market.create({
    data: {
      workspaceId: workspace.id,
      name: "Independent beauty salons",
      description:
        "Owner-operated hair and beauty salons, single location, 5–20 employees, appointment-driven revenue.",
      attractivenessNotes:
        "Fragmented (hundreds of thousands of businesses), owner is both user and buyer, revenue depends on chair time, tooling is generic booking software.",
      provenance: "USER",
    },
  });

  const icp = await prisma.iCP.create({
    data: {
      marketId: market.id,
      name: "Independent salon owner",
      role: "Owner-operator",
      companyType: "Single-location beauty salon",
      companySize: "5–20 employees",
      responsibilities: "Revenue, staffing, scheduling, retail stock, customer experience",
      economicBuyer: "The owner — confirmed in 3 interviews (demo)",
      userRole: "Owner and front-desk staff",
      reachability:
        "Local salons; the owner usually answers the phone. 12 owners contacted in the demo scenario.",
      notes: "Owner is often also a stylist: limited time to evaluate software.",
      provenance: "INTERVIEW",
    },
  });

  const variables = await Promise.all(
    [
      {
        name: "No-show rate",
        category: "CAPACITY",
        variableType: "No-show rate",
        desiredDirection: "DECREASE",
        importanceScore: 9,
        description: "Share of booked appointments not honoured or cancelled same day.",
      },
      {
        // The direct variable is LEAKAGE (a loss); the economic category is a cost
        // to the owner. "Reduce × Leakage" is coherent; the parent (net revenue) benefits.
        name: "Employee revenue leakage",
        category: "COST",
        variableType: "Leakage",
        desiredDirection: "DECREASE",
        importanceScore: 9,
        description: "Revenue lost through unrecorded services, discounts and cash handling.",
      },
      {
        name: "Idle chair capacity",
        category: "CAPACITY",
        variableType: "Idle capacity",
        desiredDirection: "DECREASE",
        importanceScore: 8,
        description: "Chair-hours available but not sold.",
      },
      {
        name: "Customer retention",
        category: "RETENTION",
        variableType: "Retention",
        desiredDirection: "INCREASE",
        importanceScore: 7,
        description: "Share of clients returning within 90 days.",
      },
      {
        name: "Inventory shrinkage",
        category: "INVENTORY",
        variableType: "Shrinkage",
        desiredDirection: "DECREASE",
        importanceScore: 6,
        description: "Retail and backbar product that disappears without a sale.",
      },
    ].map((v) =>
      prisma.variable.create({
        data: {
          icpId: icp.id,
          provenance: "AI_HYPOTHESIS",
          ...v,
          category: v.category as never,
          desiredDirection: v.desiredDirection as never,
        },
      }),
    ),
  );
  const [noShow, leakage, idle, retention, shrinkage] = variables;

  // ---- valuable variables as first-class entities.
  // Parent economic variables are HYPOTHESES (no evidence names them). Every
  // field carries its own provenance; a field nobody stated stays null (UNKNOWN).
  const H: Provenance = "AI_HYPOTHESIS";
  const I: Provenance = "INTERVIEW";
  const baseFieldProvenance = {
    name: H,
    category: H,
    variableType: H,
    desiredDirection: H,
    importanceScore: H,
  };
  const chairHour = await prisma.variable.create({
    data: {
      icpId: icp.id,
      name: "Revenue per available chair-hour",
      category: "REVENUE",
      variableType: "Revenue",
      desiredDirection: "INCREASE",
      importanceScore: 9,
      description:
        "Parent economic variable: revenue earned per chair-hour the salon pays for. No-shows and idle capacity both reduce it.",
      unit: "€ per chair-hour",
      whoValuesIt: "Owner-operator",
      whyItMatters: "Wages and rent are fixed per chair-hour; unsold hours are pure margin loss.",
      provenance: H,
      fieldProvenance: { ...baseFieldProvenance, unit: H, whoValuesIt: H, whyItMatters: H },
    },
  });
  const netRevenue = await prisma.variable.create({
    data: {
      icpId: icp.id,
      name: "Net revenue reaching the owner",
      category: "REVENUE",
      variableType: "Revenue",
      desiredDirection: "PROTECT",
      importanceScore: 9,
      description:
        "Parent economic variable: revenue that actually reaches the till and the owner. Leakage and shrinkage erode it.",
      unit: "€ per month",
      whoValuesIt: "Owner-operator",
      provenance: H,
      fieldProvenance: { ...baseFieldProvenance, unit: H, whoValuesIt: H },
    },
  });
  // Parent operational variable between the no-show rate and the economic parent.
  const chairUtil = await prisma.variable.create({
    data: {
      icpId: icp.id,
      name: "Chair utilization",
      category: "UTILIZATION",
      variableType: "Utilization",
      desiredDirection: "INCREASE",
      importanceScore: 8,
      description:
        "Parent operational variable: share of paid chair-hours actually sold. No-shows and idle capacity both lower it; it feeds revenue per available chair-hour.",
      unit: "% of paid chair-hours sold",
      whoValuesIt: "Owner-operator",
      parentVariableId: chairHour.id,
      parentDirection: "INCREASE",
      provenance: H,
      fieldProvenance: {
        ...baseFieldProvenance,
        unit: H,
        whoValuesIt: H,
        parentVariableId: H,
        parentDirection: H,
      },
    },
  });
  await prisma.variable.update({
    where: { id: noShow.id },
    data: {
      target: "booked appointments that are not honoured or are cancelled the same day",
      currentState: "Estimated 12–20% of appointments (owner estimates in the demo interviews)",
      desiredState: "< 8%",
      unit: "% of booked appointments per month",
      whoValuesIt: "Owner-operator (revenue) and stylists (commission)",
      whyItMatters:
        "Each no-show is an unsold peak chair-hour; one owner quantified it at about €1,200 a month for 8 chairs.",
      scope: "peak-hour bookings at single-location salons",
      parentVariableId: chairUtil.id,
      parentDirection: "INCREASE",
      fieldProvenance: {
        ...baseFieldProvenance,
        target: H,
        scope: H,
        currentState: I,
        desiredState: H,
        unit: H,
        whoValuesIt: I,
        whyItMatters: I,
        parentVariableId: H,
        parentDirection: H,
      },
    },
  });
  await prisma.variable.update({
    where: { id: leakage.id },
    data: {
      target: "services performed, discounts given and cash received that never reach the till",
      currentState: "Owners suspect 3–8% of revenue; nobody measures it (demo interviews)",
      desiredState: "< 1% with weekly reconciliation",
      unit: "% of monthly revenue",
      whoValuesIt: "Owner-operator; the accountant indirectly",
      whyItMatters:
        "Discovered months late, usually after a stylist leaves: €9,000 over six months in one demo interview.",
      parentVariableId: netRevenue.id,
      parentDirection: "INCREASE",
      scope: "services, discounts and cash handled by employees",
      fieldProvenance: {
        ...baseFieldProvenance,
        target: H,
        scope: H,
        parentDirection: H,
        currentState: I,
        desiredState: H,
        unit: H,
        whoValuesIt: I,
        whyItMatters: I,
        parentVariableId: H,
      },
    },
  });
  await prisma.variable.update({
    where: { id: idle.id },
    data: {
      target: "chair-hours paid for but unsold on Tuesday–Thursday afternoons",
      currentState: "40–60% mid-week occupancy (owner estimates)",
      desiredState: "> 80% occupancy",
      unit: "% occupancy, mid-week afternoons",
      whoValuesIt: "Owner-operator",
      parentVariableId: chairUtil.id,
      parentDirection: "INCREASE",
      fieldProvenance: {
        ...baseFieldProvenance,
        target: H,
        currentState: I,
        desiredState: H,
        unit: H,
        whoValuesIt: H,
        parentVariableId: H,
        parentDirection: H,
      },
    },
  });
  await prisma.variable.update({
    where: { id: retention.id },
    data: {
      target: "clients who return within 90 days of a visit",
      unit: "% of clients returning within 90 days",
      // current and desired state: UNKNOWN — nobody in the demo measured it.
      fieldProvenance: { ...baseFieldProvenance, target: H, unit: H },
    },
  });
  await prisma.variable.update({
    where: { id: shrinkage.id },
    data: {
      target: "retail and backbar product that disappears without a sale or service record",
      parentVariableId: netRevenue.id,
      parentDirection: "INCREASE",
      // current state: UNKNOWN — "a few hundred euros a month" is a guess, not a measurement.
      fieldProvenance: {
        ...baseFieldProvenance,
        target: H,
        parentVariableId: H,
        parentDirection: H,
      },
    },
  });

  // ---- pains
  const noShowPain = await prisma.pain.create({
    data: {
      variableId: noShow.id,
      description:
        "Same-day cancellations and no-shows leave chairs empty during peak hours and the slot cannot be resold in time.",
      severityScore: 8,
      frequencyScore: 9,
      currentState: "Estimated 12–20% of appointments (owner estimates, demo interviews)",
      desiredState: "< 8% with resold slots",
      gapDescription:
        "Roughly one chair-day per week per stylist lost. Owners track it by memory, not data.",
      provenance: "INTERVIEW",
      triggers: {
        create: [
          {
            description: "Two or more no-shows in a single Saturday morning",
            urgencyScore: 8,
            frequency: "Weekly in peak season",
            provenance: "INTERVIEW",
          },
          {
            description: "A stylist complains about lost commission after an empty afternoon",
            urgencyScore: 6,
            frequency: "Monthly",
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
      alternatives: {
        create: [
          {
            name: "WhatsApp reminders sent by the front desk",
            category: "MESSAGING",
            description: "Manual confirmation messages the day before.",
            costEstimate: "30–45 min of staff time per day",
            weaknessDescription:
              "Inconsistent, no risk prioritization, no deposit adaptation, no waitlist.",
            weaknessScore: 7,
            provenance: "INTERVIEW",
          },
          {
            name: "Phone calls to confirm",
            category: "PHONE",
            description: "Calling clients for high-value appointments.",
            costEstimate: "Staff time",
            weaknessDescription: "Only feasible for a few appointments; often unanswered.",
            weaknessScore: 8,
            provenance: "INTERVIEW",
          },
          {
            name: "Basic booking software reminders",
            category: "COMPETITOR_SOFTWARE",
            description: "Automatic SMS/email reminder 24h before.",
            costEstimate: "€30–60/month bundled",
            weaknessDescription:
              "Reminds everyone the same way; no prediction, no deposits, no waitlist optimization.",
            weaknessScore: 6,
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
    },
  });

  const leakagePain = await prisma.pain.create({
    data: {
      variableId: leakage.id,
      description:
        "Services performed but not recorded, unauthorised discounts and cash payments that never reach the till.",
      severityScore: 9,
      frequencyScore: 7,
      currentState: "Owners suspect 3–8% of revenue; nobody measures it (demo interviews)",
      desiredState: "< 1% with weekly reconciliation",
      gapDescription: "Owners discover leakage months later, usually after a stylist leaves.",
      provenance: "INTERVIEW",
      triggers: {
        create: [
          {
            description: "Month-end revenue is lower than the appointment book suggests",
            urgencyScore: 8,
            frequency: "Monthly",
            provenance: "INTERVIEW",
          },
          {
            description: "A stylist leaves and takes clients; discrepancies surface",
            urgencyScore: 9,
            frequency: "Quarterly",
            provenance: "INTERVIEW",
          },
        ],
      },
      alternatives: {
        create: [
          {
            name: "Manual till vs booking reconciliation in a spreadsheet",
            category: "SPREADSHEET",
            description: "Owner compares POS totals with the booking calendar.",
            costEstimate: "2–4 h per week",
            weaknessDescription: "Done irregularly; cannot see service-level discrepancies.",
            weaknessScore: 8,
            provenance: "INTERVIEW",
          },
          {
            name: "Trusting the stylists",
            category: "NO_SOLUTION",
            description: "Most owners do nothing systematic.",
            costEstimate: "Free",
            weaknessDescription: "Leakage invisible until it is large.",
            weaknessScore: 9,
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
    },
  });

  const idlePain = await prisma.pain.create({
    data: {
      variableId: idle.id,
      description:
        "Tuesday to Thursday afternoons run at 40–60% occupancy while staff are paid for the full shift.",
      severityScore: 7,
      frequencyScore: 8,
      currentState: "40–60% mid-week occupancy (owner estimates)",
      desiredState: "> 80% occupancy",
      gapDescription: "Paid staff hours without revenue; owners rarely quantify it.",
      provenance: "INTERVIEW",
      triggers: {
        create: [
          {
            description: "Payroll day when mid-week revenue does not cover wages",
            urgencyScore: 7,
            frequency: "Monthly",
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
      alternatives: {
        create: [
          {
            name: "Instagram promotions for quiet days",
            category: "MANUAL_PROCESS",
            description: "Ad-hoc posts offering discounts.",
            costEstimate: "Owner time",
            weaknessDescription: "Untargeted, unpredictable, trains clients to wait for discounts.",
            weaknessScore: 6,
            provenance: "INTERVIEW",
          },
          {
            name: "Marketplace listings (last-minute deal apps)",
            category: "COMPETITOR_SOFTWARE",
            description: "Third-party apps selling discounted slots.",
            costEstimate: "20–30% commission",
            weaknessDescription: "Expensive, attracts one-off bargain hunters.",
            weaknessScore: 6,
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
    },
  });

  const retentionPain = await prisma.pain.create({
    data: {
      variableId: retention.id,
      description:
        "Clients drift to other salons after 2–3 visits; owners only notice when the book thins out.",
      severityScore: 5,
      frequencyScore: 5,
      currentState: "UNKNOWN — no salon in the demo interviews measured 90-day return rate",
      desiredState: "UNKNOWN",
      gapDescription: "Owners believe retention is fine; evidence is anecdotal.",
      provenance: "AI_HYPOTHESIS",
      alternatives: {
        create: [
          {
            name: "Loyalty features bundled in booking software",
            category: "COMPETITOR_SOFTWARE",
            description: "Points and rebooking prompts already included in common salon software.",
            costEstimate: "Included",
            weaknessDescription: "Owners find the existing features adequate.",
            weaknessScore: 2,
            provenance: "INTERVIEW",
          },
        ],
      },
    },
  });

  const shrinkagePain = await prisma.pain.create({
    data: {
      variableId: shrinkage.id,
      description:
        "Retail products and backbar colour disappear without a matching sale or service record.",
      severityScore: 6,
      frequencyScore: 6,
      currentState: "UNKNOWN — owners estimate 'a few hundred euros a month'",
      desiredState: "UNKNOWN",
      gapDescription: "No stock counts; suspicion but no data.",
      provenance: "AI_HYPOTHESIS",
      alternatives: {
        create: [
          {
            name: "Occasional manual stock count",
            category: "MANUAL_PROCESS",
            description: "Quarterly count by the owner.",
            costEstimate: "Half a day per quarter",
            weaknessDescription: "Too infrequent to attribute losses.",
            weaknessScore: 7,
            provenance: "AI_HYPOTHESIS",
          },
        ],
      },
    },
  });

  // ---- mechanisms (several per pain — problem ≠ product)
  await prisma.productMechanism.createMany({
    data: [
      {
        workspaceId: workspace.id,
        painId: noShowPain.id,
        name: "Risk prediction per appointment",
        category: "PREDICTION",
        description: "Flag bookings likely to no-show and prioritize confirmation.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: noShowPain.id,
        name: "Dynamic deposits",
        category: "FINTECH",
        description: "Require a deposit only for high-risk bookings.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: noShowPain.id,
        name: "Automated waitlist backfill",
        category: "AUTOMATION",
        description: "Offer freed slots to a waitlist within minutes.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: noShowPain.id,
        name: "Adaptive reminders",
        category: "AUTOMATION",
        description: "Reminder timing and channel per client behaviour.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: noShowPain.id,
        name: "Cancellation policy redesign (non-software)",
        category: "OTHER",
        description: "Clear policy communicated at booking; a service, not software.",
        provenance: "USER",
      },
      {
        workspaceId: workspace.id,
        painId: leakagePain.id,
        name: "POS ↔ booking reconciliation",
        category: "DATA_AGGREGATION",
        description: "Match every appointment to a payment; surface gaps weekly.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: leakagePain.id,
        name: "Anomaly detection on discounts",
        category: "MONITORING",
        description: "Alert on discount patterns per stylist.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: idlePain.id,
        name: "Off-peak dynamic pricing",
        category: "OPTIMIZATION",
        description: "Lower prices for mid-week slots automatically.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        painId: idlePain.id,
        name: "Targeted rebooking nudges",
        category: "AUTOMATION",
        description: "Invite lapsed clients into quiet slots.",
        provenance: "AI_HYPOTHESIS",
      },
    ],
  });

  // ---- evidence (all DEMO DATA)
  const ev = async (data: Parameters<typeof prisma.evidence.create>[0]["data"]) =>
    prisma.evidence.create({ data: { ...data, isDemo: true, origin: "DEMO" } });

  const e1 = await ev({
    workspaceId: workspace.id,
    painId: noShowPain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, 8 chairs (demo)",
    sourceExcerpt:
      "DEMO DATA. “Saturdays we lose two or three appointments to no-shows. That's easily €300 a week, so around €1,200 a month. We WhatsApp everyone the day before and it still happens.”",
    sourceDate: daysAgo(21),
    sourceAuthor: "Owner A (anonymised)",
    relevanceScore: 9,
    strengthScore: 9,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasEconomicImpact: true,
    hasWorkaround: true,
  });
  const e2 = await ev({
    workspaceId: workspace.id,
    painId: noShowPain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, 5 chairs (demo)",
    sourceExcerpt:
      "DEMO DATA. “We started asking for a €20 deposit for colour appointments after too many people didn't show. Bookings dipped for a week then came back. I'd pay for something that handles it automatically.”",
    sourceDate: daysAgo(14),
    sourceAuthor: "Owner B (anonymised)",
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasWorkaround: true,
    hasPurchaseIntent: true,
  });
  const e3 = await ev({
    workspaceId: workspace.id,
    painId: noShowPain.id,
    type: "COMPETITOR_REVIEW",
    sourceTitle: "Review of a booking tool mentioning no-shows (demo)",
    sourceExcerpt:
      "DEMO DATA. “The reminders are fine but they go to everyone. I still can't tell who is going to flake, and there is no waitlist.”",
    sourceDate: daysAgo(60),
    relevanceScore: 7,
    strengthScore: 6,
    sentiment: "POSITIVE",
    hasExplicitPain: true,
  });
  const e4 = await ev({
    workspaceId: workspace.id,
    painId: noShowPain.id,
    type: "REDDIT",
    sourceTitle: "r/hairstylist thread on cancellation policies (demo)",
    sourceExcerpt:
      "DEMO DATA. Several stylists describe charging deposits or blocking repeat offenders. One says no-shows are 'just part of the job' and not worth the hassle.",
    sourceDate: daysAgo(120),
    relevanceScore: 6,
    strengthScore: 4,
    sentiment: "NEUTRAL",
    hasWorkaround: true,
  });
  const e5 = await ev({
    workspaceId: workspace.id,
    painId: noShowPain.id,
    type: "REDDIT",
    sourceTitle: "Comment: reminders already solve it (demo)",
    sourceExcerpt:
      "DEMO DATA. “Honestly since our software sends reminders we barely get no-shows anymore. Maybe one a week.” — contradicts the assumption that reminders are insufficient.",
    sourceDate: daysAgo(90),
    relevanceScore: 6,
    strengthScore: 5,
    sentiment: "NEGATIVE",
  });

  const e6 = await ev({
    workspaceId: workspace.id,
    painId: leakagePain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, 12 chairs (demo)",
    sourceExcerpt:
      "DEMO DATA. “When my senior colourist left I found about €9,000 of services over six months that were never rung up. I now spend Sunday evenings comparing the book with the till.”",
    sourceDate: daysAgo(18),
    sourceAuthor: "Owner C (anonymised)",
    relevanceScore: 10,
    strengthScore: 9,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasEconomicImpact: true,
    hasWorkaround: true,
  });
  const e7 = await ev({
    workspaceId: workspace.id,
    painId: leakagePain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, 6 chairs (demo)",
    sourceExcerpt:
      "DEMO DATA. “I pay an accountant €150 a month partly to spot this. If software did it weekly I'd switch tomorrow.”",
    sourceDate: daysAgo(9),
    sourceAuthor: "Owner D (anonymised)",
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasEconomicImpact: true,
    hasPurchaseIntent: true,
  });
  const e8 = await ev({
    workspaceId: workspace.id,
    painId: leakagePain.id,
    type: "SURVEY",
    sourceTitle: "Survey of 40 salon owners — revenue control (demo)",
    sourceExcerpt:
      "DEMO DATA. 28 of 40 respondents said they suspect unrecorded services; 11 had caught a case in the last year; 19 would pay €50+/month for weekly reconciliation.",
    sourceDate: daysAgo(40),
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasPurchaseIntent: true,
  });
  const e9 = await ev({
    workspaceId: workspace.id,
    painId: leakagePain.id,
    type: "JOB_POSTING",
    sourceTitle: "Job posting: salon manager, 'daily till reconciliation' (demo)",
    sourceExcerpt:
      "DEMO DATA. Duties include reconciling appointments against payments daily and reporting discrepancies to the owner.",
    sourceDate: daysAgo(30),
    relevanceScore: 7,
    strengthScore: 6,
    sentiment: "POSITIVE",
    hasWorkaround: true,
    hasEconomicImpact: true,
  });
  const e10 = await ev({
    workspaceId: workspace.id,
    painId: leakagePain.id,
    type: "FORUM_POST",
    sourceTitle: "Salon owners forum: 'how do you catch stylists skimming?' (demo)",
    sourceExcerpt:
      "DEMO DATA. Long thread; owners share spreadsheet templates and camera setups. Strong emotional language about trust.",
    sourceDate: daysAgo(200),
    relevanceScore: 8,
    strengthScore: 6,
    sentiment: "POSITIVE",
    hasExplicitPain: true,
    hasWorkaround: true,
  });

  const e11 = await ev({
    workspaceId: workspace.id,
    painId: idlePain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, 8 chairs, mid-week (demo)",
    sourceExcerpt:
      "DEMO DATA. “Tuesday afternoons I have three stylists and maybe four clients. That's wages for nothing. I post a 20% off story on Instagram and hope.”",
    sourceDate: daysAgo(25),
    sourceAuthor: "Owner A (anonymised)",
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasEconomicImpact: true,
    hasWorkaround: true,
  });
  await ev({
    workspaceId: workspace.id,
    painId: idlePain.id,
    type: "COMPETITOR_REVIEW",
    sourceTitle: "Review of a last-minute deals marketplace (demo)",
    sourceExcerpt:
      "DEMO DATA. “Fills a couple of slots a week but the commission is brutal and those clients never come back at full price.”",
    sourceDate: daysAgo(70),
    relevanceScore: 7,
    strengthScore: 6,
    sentiment: "POSITIVE",
    hasExplicitPain: true,
    hasWorkaround: true,
  });
  await ev({
    workspaceId: workspace.id,
    painId: idlePain.id,
    type: "MARKET_REPORT",
    sourceTitle: "Industry note on salon utilization (demo)",
    sourceExcerpt:
      "DEMO DATA. Illustrative note stating mid-week utilization is a common concern. Contains no real statistics by design.",
    sourceDate: daysAgo(300),
    relevanceScore: 5,
    strengthScore: 4,
    sentiment: "NEUTRAL",
  });

  // Retention: evidence exists, but it contradicts the *structure* (alternatives adequate).
  const e14 = await ev({
    workspaceId: workspace.id,
    painId: retentionPain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner on retention (demo)",
    sourceExcerpt:
      "DEMO DATA. “Clients leaving? Sure, some do. The booking app already sends rebooking reminders and we have a stamp card. I wouldn't pay more for that.”",
    sourceDate: daysAgo(12),
    sourceAuthor: "Owner B (anonymised)",
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
  });
  await ev({
    workspaceId: workspace.id,
    painId: retentionPain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner, retention tooling (demo)",
    sourceExcerpt:
      "DEMO DATA. “Retention is the stylist's job, not software's. If someone leaves it's because they didn't like the cut.”",
    sourceDate: daysAgo(15),
    sourceAuthor: "Owner C (anonymised)",
    relevanceScore: 8,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
  });
  await ev({
    workspaceId: workspace.id,
    painId: retentionPain.id,
    type: "INTERVIEW",
    sourceTitle: "Interview — salon owner quantifying churn (demo)",
    sourceExcerpt:
      "DEMO DATA. “Maybe two or three clients a month don't come back. That's €200, perhaps €300. It's real, but it's not a problem I'd spend money on.”",
    sourceDate: daysAgo(20),
    sourceAuthor: "Owner A (anonymised)",
    relevanceScore: 9,
    strengthScore: 8,
    sentiment: "POSITIVE",
    isDirectCustomer: true,
    hasExplicitPain: true,
    hasEconomicImpact: true,
  });
  await ev({
    workspaceId: workspace.id,
    painId: retentionPain.id,
    type: "COMPETITOR_REVIEW",
    sourceTitle: "Review praising built-in loyalty features (demo)",
    sourceExcerpt:
      "DEMO DATA. “The loyalty points and automatic rebooking texts are the best part of the software.” Supports the view that alternatives are adequate.",
    sourceDate: daysAgo(50),
    relevanceScore: 8,
    strengthScore: 7,
    sentiment: "POSITIVE",
    hasExplicitPain: true,
    hasWorkaround: true,
  });

  await ev({
    workspaceId: workspace.id,
    painId: shrinkagePain.id,
    type: "FORUM_POST",
    sourceTitle: "Forum: 'backbar colour keeps disappearing' (demo)",
    sourceExcerpt:
      "DEMO DATA. A few owners complain about product going missing; most say they have never counted.",
    sourceDate: daysAgo(150),
    relevanceScore: 6,
    strengthScore: 4,
    sentiment: "NEUTRAL",
    hasExplicitPain: true,
  });

  // ---- opportunities
  const mkOpp = (data: Omit<Prisma.OpportunityUncheckedCreateInput, "workspaceId">) =>
    prisma.opportunity.create({ data: { workspaceId: workspace.id, ...data } });

  const leakageOpp = await mkOpp({
    title: "Employee revenue leakage detection",
    icpId: icp.id,
    variableId: leakage.id,
    painId: leakagePain.id,
    problemStatement:
      "Owners lose 3–8% of revenue to unrecorded services and discounts and only discover it months later.",
    mechanism: "POS ↔ booking reconciliation with weekly discrepancy report",
    productHypothesis:
      "A reconciliation layer that matches every appointment to a payment and flags gaps per stylist each week.",
    valueProposition: "Recover leaked revenue and remove the Sunday-evening spreadsheet ritual.",
    metric: "Unreconciled revenue per week (€)",
    importance: 9,
    painIntensity: 9,
    frequency: 8,
    gap: 9,
    willingnessToPay: 9,
    alternativeWeakness: 9,
    risks: [
      "Requires POS and booking integrations",
      "Owners may prefer to avoid confronting staff",
    ],
    nextSteps: [
      "Concierge test: reconcile 5 salons manually for a month",
      "Confirm integration access with two POS vendors",
    ],
    provenance: "AI_HYPOTHESIS",
  });

  const noShowOpp = await mkOpp({
    title: "Salon no-show prevention",
    icpId: icp.id,
    variableId: noShow.id,
    painId: noShowPain.id,
    problemStatement:
      "12–20% no-shows leave chairs empty at peak; reminders go to everyone and slots are not resold.",
    mechanism: "Risk prediction + dynamic deposits + waitlist backfill",
    productHypothesis:
      "A no-show prevention layer for salons that predicts risk, asks deposits selectively and refills freed slots.",
    valueProposition: "Reduce missed appointments and recover unused salon capacity.",
    metric: "No-show rate per month (%)",
    importance: 9,
    painIntensity: 9,
    frequency: 9,
    gap: 9,
    willingnessToPay: 8,
    alternativeWeakness: 8,
    risks: ["Deposits may reduce bookings", "Booking software vendors could bundle this"],
    nextSteps: [
      "Interview five salon owners with >100 bookings/month",
      "Quantify current no-show rate from booking exports",
    ],
    provenance: "AI_HYPOTHESIS",
  });

  const idleOpp = await mkOpp({
    title: "Mid-week idle capacity filling",
    icpId: icp.id,
    variableId: idle.id,
    painId: idlePain.id,
    problemStatement: "Mid-week afternoons run at 40–60% while wages are fixed.",
    mechanism: "Targeted rebooking nudges into quiet slots",
    productHypothesis:
      "Automated invitations to lapsed or flexible clients for specific quiet slots, without public discounts.",
    valueProposition: "Sell chair-hours that are currently paid for and empty.",
    metric: "Mid-week occupancy (%)",
    importance: 8,
    painIntensity: 8,
    frequency: 8,
    gap: 8,
    willingnessToPay: 8,
    alternativeWeakness: 7,
    risks: ["Clients may learn to wait for quiet-slot offers"],
    nextSteps: ["Interview owners about what they have tried mid-week"],
    provenance: "AI_HYPOTHESIS",
  });

  const shrinkageOpp = await mkOpp({
    title: "Inventory shrinkage control",
    icpId: icp.id,
    variableId: shrinkage.id,
    painId: shrinkagePain.id,
    problemStatement: "Product disappears without records; owners suspect but never measure.",
    mechanism: "Lightweight stock counts tied to service records",
    productHypothesis: "Weekly guided stock count that reconciles usage with services performed.",
    valueProposition: "Turn a vague suspicion into a measured, controllable number.",
    metric: "Unexplained stock variance per month (€)",
    importance: 7,
    painIntensity: 6,
    frequency: 6,
    gap: 7,
    willingnessToPay: 6,
    alternativeWeakness: 6,
    risks: ["Owners may not consider the amount worth the effort"],
    nextSteps: ["Find evidence of the actual monthly loss"],
    provenance: "AI_HYPOTHESIS",
  });

  const pricingOpp = await mkOpp({
    title: "Dynamic pricing for off-peak slots",
    icpId: icp.id,
    variableId: idle.id,
    painId: idlePain.id,
    problemStatement: "Prices are flat regardless of demand; quiet slots stay unsold.",
    mechanism: "Off-peak dynamic pricing",
    productHypothesis: "Automatic price adjustments for low-demand slots inside the booking flow.",
    valueProposition: "Fill quiet slots without manual promotions.",
    metric: "Revenue per available chair-hour",
    importance: 7,
    painIntensity: 5,
    frequency: 6,
    gap: 7,
    willingnessToPay: 4,
    alternativeWeakness: 5,
    risks: ["Owners fear cheapening the brand", "Requires deep booking-software integration"],
    nextSteps: ["Research whether any salon uses variable pricing today"],
    provenance: "AI_HYPOTHESIS",
  });

  const loyaltyOpp = await mkOpp({
    title: "Salon loyalty and retention app",
    icpId: icp.id,
    variableId: retention.id,
    painId: retentionPain.id,
    problemStatement: "Clients drift away after a few visits.",
    mechanism: "Loyalty points and rebooking prompts",
    productHypothesis: "A standalone loyalty app for salon clients.",
    valueProposition: "Bring clients back more often.",
    metric: "90-day return rate (%)",
    importance: 5,
    painIntensity: 4,
    frequency: 4,
    gap: 4,
    willingnessToPay: 3,
    alternativeWeakness: 2,
    risks: ["Booking software already bundles loyalty features"],
    nextSteps: [],
    provenance: "AI_HYPOTHESIS",
  });

  const websiteOpp = await mkOpp({
    title: "Salon website builder",
    icpId: icp.id,
    variableId: retention.id,
    painId: null,
    problemStatement: "Some salons have outdated websites.",
    mechanism: "Template website builder",
    productHypothesis: "A niche website builder for salons.",
    valueProposition: "A nicer website.",
    metric: null,
    importance: 3,
    painIntensity: 3,
    frequency: 3,
    gap: 3,
    willingnessToPay: 3,
    alternativeWeakness: 2,
    risks: ["Generic builders already solve this"],
    nextSteps: [],
    provenance: "USER",
  });

  // ---- value causality ladders. Statements are HYPOTHESES; the status of each
  // node and link is computed from linked evidence at recompute time. Nothing
  // below marks a claim as proven.
  const ladder = async (
    opportunityId: string,
    statements: Partial<Record<ValueChainLevel, string>>,
    links: Array<{
      from: ValueChainLevel;
      to: ValueChainLevel;
      statement: string;
      criticality?: Criticality;
    }>,
  ) => {
    const nodes = new Map<ValueChainLevel, string>();
    for (const [level, statement] of Object.entries(statements) as Array<
      [ValueChainLevel, string]
    >) {
      const n = await prisma.valueChainNode.create({
        data: {
          opportunityId,
          level,
          statement,
          status: "HYPOTHESIS",
          causalDistance: CAUSAL_DISTANCE_BY_LEVEL[level],
          generatedBy: "AI_HYPOTHESIS",
        },
      });
      nodes.set(level, n.id);
    }
    const linkIds = new Map<string, string>();
    for (const l of links) {
      const created = await prisma.causalLink.create({
        data: {
          opportunityId,
          fromNodeId: nodes.get(l.from)!,
          toNodeId: nodes.get(l.to)!,
          statement: l.statement,
          criticality: l.criticality ?? "CRITICAL",
          status: "HYPOTHESIS",
          generatedBy: "AI_HYPOTHESIS",
        },
      });
      linkIds.set(`${l.from}->${l.to}`, created.id);
    }
    return {
      node: (level: ValueChainLevel) => nodes.get(level)!,
      link: (from: ValueChainLevel, to: ValueChainLevel) => linkIds.get(`${from}->${to}`)!,
    };
  };

  const noShowLadder = await ladder(
    noShowOpp.id,
    {
      MECHANISM:
        "Risk prediction per booking plus an adaptive intervention (deposit, reminder or waitlist offer).",
      CAPABILITY:
        "Identify the bookings most likely to become no-shows and react before the appointment time.",
      TRANSFORMATION: "Fewer high-risk appointments become unrecoverable empty slots.",
      OPERATIONAL_VALUE:
        "More appointments are attended, cancelled earlier, or backfilled from the waitlist.",
      ECONOMIC_VALUE: "Unused peak chair capacity decreases.",
      STRATEGIC_OUTCOME: "Revenue per available chair-hour potentially increases.",
    },
    [
      {
        from: "MECHANISM",
        to: "CAPABILITY",
        statement:
          "The booking history contains enough signal to predict which appointments will not be honoured.",
      },
      {
        from: "CAPABILITY",
        to: "TRANSFORMATION",
        statement:
          "If a high-risk booking receives a deposit request or an adaptive reminder, it is less likely to end as a no-show.",
      },
      {
        from: "TRANSFORMATION",
        to: "OPERATIONAL_VALUE",
        statement: "Slots freed early enough can actually be resold or attended in time to matter.",
      },
      {
        from: "OPERATIONAL_VALUE",
        to: "ECONOMIC_VALUE",
        statement:
          "Attended and backfilled appointments translate into paid chair-hours, not just activity.",
      },
      {
        from: "ECONOMIC_VALUE",
        to: "STRATEGIC_OUTCOME",
        statement: "The recovered capacity is large enough to move revenue per chair-hour.",
        criticality: "IMPORTANT",
      },
    ],
  );

  const leakageLadder = await ladder(
    leakageOpp.id,
    {
      MECHANISM:
        "Match every appointment in the booking system against a payment in the till (owners do this manually today).",
      CAPABILITY:
        "Unrecorded services and unauthorised discounts are surfaced per stylist, every week.",
      TRANSFORMATION:
        "Fewer services go unrecorded because discrepancies are caught within the week, not months later.",
      OPERATIONAL_VALUE:
        "The owner stops the Sunday-evening spreadsheet ritual and acts on a short weekly list.",
      ECONOMIC_VALUE:
        "Leaked revenue is recovered or prevented; the accountant's leakage work shrinks.",
      STRATEGIC_OUTCOME: "Net revenue reaching the owner increases.",
    },
    [
      {
        from: "MECHANISM",
        to: "CAPABILITY",
        statement:
          "Matching appointments to payments reveals the unrecorded services, and the data to do it exists in the POS and booking exports.",
      },
      {
        from: "CAPABILITY",
        to: "TRANSFORMATION",
        statement: "Owners act on surfaced discrepancies quickly enough that the leakage stops.",
      },
      {
        from: "TRANSFORMATION",
        to: "OPERATIONAL_VALUE",
        statement:
          "A weekly automated report replaces the manual reconciliation rather than adding to it.",
      },
      {
        from: "OPERATIONAL_VALUE",
        to: "ECONOMIC_VALUE",
        statement:
          "Caught leakage is actually recovered (or deterred) in money, not only identified.",
      },
      {
        from: "ECONOMIC_VALUE",
        to: "STRATEGIC_OUTCOME",
        statement: "Recovered leakage is material relative to net revenue.",
        criticality: "IMPORTANT",
      },
    ],
  );

  // First deterministic pass: ladders stated, nothing linked to them yet.
  // The later pass records what the linked evidence changed — the learning
  // history is derived from the seed's own evidence, never written by hand.
  const allOpps = [
    leakageOpp,
    noShowOpp,
    idleOpp,
    shrinkageOpp,
    pricingOpp,
    loyaltyOpp,
    websiteOpp,
  ];
  for (const o of allOpps) await recomputeOpportunity(o.id);

  // ---- evidence → claims. Only what the excerpt actually shows. The engine
  // decides the status; the frontier is derived, never declared.
  const claim = async (
    evidenceId: string,
    opportunityId: string,
    claimType: Parameters<typeof prisma.evidenceClaimLink.create>[0]["data"]["claimType"],
    target: { valueChainNodeId?: string; causalLinkId?: string } = {},
    direction: EvidenceLinkDirection = "SUPPORTS",
  ) =>
    prisma.evidenceClaimLink.create({
      data: { evidenceId, opportunityId, claimType, direction, ...target },
    });

  // Leakage: manual reconciliation is a documented practice (interview, job
  // posting, forum) and it revealed €9,000 of unrecorded services → the
  // mechanism and the capability have evidence. Nothing downstream has any.
  await claim(e6.id, leakageOpp.id, "VALUE_CHAIN_NODE", {
    valueChainNodeId: leakageLadder.node("MECHANISM"),
  });
  await claim(e9.id, leakageOpp.id, "VALUE_CHAIN_NODE", {
    valueChainNodeId: leakageLadder.node("MECHANISM"),
  });
  await claim(e10.id, leakageOpp.id, "VALUE_CHAIN_NODE", {
    valueChainNodeId: leakageLadder.node("MECHANISM"),
  });
  await claim(e6.id, leakageOpp.id, "VALUE_CHAIN_NODE", {
    valueChainNodeId: leakageLadder.node("CAPABILITY"),
  });
  await claim(e6.id, leakageOpp.id, "CAUSAL_LINK", {
    causalLinkId: leakageLadder.link("MECHANISM", "CAPABILITY"),
  });
  await claim(e9.id, leakageOpp.id, "CAUSAL_LINK", {
    causalLinkId: leakageLadder.link("MECHANISM", "CAPABILITY"),
  });
  // Owner C changed behaviour after finding the gap (acts on discrepancies) —
  // but nothing shows the leakage then stopped: the transformation stays a hypothesis.
  await claim(e6.id, leakageOpp.id, "CAUSAL_LINK", {
    causalLinkId: leakageLadder.link("CAPABILITY", "TRANSFORMATION"),
  });
  await claim(e7.id, leakageOpp.id, "WILLINGNESS_TO_PAY");
  await claim(e8.id, leakageOpp.id, "WILLINGNESS_TO_PAY");
  await claim(e6.id, leakageOpp.id, "MAGNITUDE");
  await claim(e8.id, leakageOpp.id, "FREQUENCY");

  // No-show: the problem is well evidenced, the ladder is not. One comment
  // contradicts the premise that reminders are insufficient.
  await claim(e1.id, noShowOpp.id, "MAGNITUDE");
  await claim(e1.id, noShowOpp.id, "FREQUENCY");
  await claim(e2.id, noShowOpp.id, "WILLINGNESS_TO_PAY");
  await claim(e3.id, noShowOpp.id, "ALTERNATIVE");
  await claim(e5.id, noShowOpp.id, "ALTERNATIVE", {}, "CONTRADICTS");

  // ---- assumptions with evidence links
  const link = async (
    assumptionId: string,
    evidenceId: string,
    direction: "SUPPORTS" | "CONTRADICTS",
  ) => prisma.assumptionEvidence.create({ data: { assumptionId, evidenceId, direction } });

  const a1 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement:
        "Salon owners lose significant revenue from no-shows (> €1,000/month for 5+ chairs).",
      importance: 9,
      kind: "VALUE",
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a1.id, e1.id, "SUPPORTS");
  await link(a1.id, e3.id, "SUPPORTS");
  const a2 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement: "The owner controls software purchases.",
      importance: 8,
      kind: "ACCESS",
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a2.id, e2.id, "SUPPORTS");
  await link(a2.id, e7.id, "SUPPORTS");
  const a3 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement: "Selective deposits reduce no-shows without reducing bookings.",
      importance: 9,
      kind: "CAUSAL",
      causalLinkId: noShowLadder.link("CAPABILITY", "TRANSFORMATION"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a3.id, e2.id, "SUPPORTS");
  await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement: "Salons would pay €79–149/month for no-show prevention.",
      importance: 8,
      kind: "WTP",
      provenance: "AI_HYPOTHESIS",
    },
  });
  const a5 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement: "Existing reminder features are insufficient.",
      importance: 7,
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a5.id, e3.id, "SUPPORTS");
  await link(a5.id, e4.id, "SUPPORTS");

  const a6 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: leakageOpp.id,
      statement: "Owners will confront staff when shown discrepancies.",
      importance: 8,
      kind: "CAUSAL",
      causalLinkId: leakageLadder.link("CAPABILITY", "TRANSFORMATION"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a6.id, e6.id, "SUPPORTS");
  const a7 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: leakageOpp.id,
      statement: "POS and booking systems expose the data needed for reconciliation.",
      importance: 9,
      kind: "FEASIBILITY",
      causalLinkId: leakageLadder.link("MECHANISM", "CAPABILITY"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  const a8 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: leakageOpp.id,
      statement: "Owners already pay someone (accountant, manager) to catch leakage.",
      importance: 7,
      kind: "WTP",
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a8.id, e7.id, "SUPPORTS");
  await link(a8.id, e8.id, "SUPPORTS");

  const a9 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: idleOpp.id,
      statement: "Clients accept invitations into specific quiet slots without discounts.",
      importance: 9,
      kind: "CAUSAL",
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a9.id, e11.id, "SUPPORTS");
  const a10 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: loyaltyOpp.id,
      statement: "Owners consider bundled loyalty features insufficient.",
      importance: 9,
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a10.id, e14.id, "CONTRADICTS");
  await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: shrinkageOpp.id,
      statement: "Monthly shrinkage exceeds €300 for a typical salon.",
      importance: 8,
      kind: "VALUE",
      provenance: "AI_HYPOTHESIS",
    },
  });
  await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: pricingOpp.id,
      statement: "Owners are willing to vary prices by time of day.",
      importance: 9,
      kind: "ACCESS",
      provenance: "AI_HYPOTHESIS",
    },
  });

  // New causally explicit assumptions (UNKNOWN until evidence is linked).
  await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement: "Booking platforms expose enough data to calculate appointment risk.",
      importance: 8,
      kind: "FEASIBILITY",
      causalLinkId: noShowLadder.link("MECHANISM", "CAPABILITY"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: noShowOpp.id,
      statement:
        "A 5 percentage-point reduction in no-shows creates enough economic value to justify the product.",
      importance: 8,
      kind: "VALUE",
      causalLinkId: noShowLadder.link("OPERATIONAL_VALUE", "ECONOMIC_VALUE"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  const a13 = await prisma.assumption.create({
    data: {
      workspaceId: workspace.id,
      opportunityId: leakageOpp.id,
      statement: "Recovered leakage exceeds the subscription price for a typical salon.",
      importance: 8,
      kind: "VALUE",
      causalLinkId: leakageLadder.link("OPERATIONAL_VALUE", "ECONOMIC_VALUE"),
      provenance: "AI_HYPOTHESIS",
    },
  });
  await link(a13.id, e6.id, "SUPPORTS");
  await link(a13.id, e7.id, "SUPPORTS");

  // ---- Value Strength dimensions (0–10). Only what evidence or the user
  // stated gets a number; a dimension nobody measured stays null → INCOMPLETE.
  await prisma.opportunity.update({
    where: { id: leakageOpp.id },
    data: {
      vsImportance: 9,
      vsMagnitude: 7,
      vsFrequency: 7,
      vsPopulation: 7,
      vsAttributability: 8,
      valueDimensionProvenance: {
        importance: "INTERVIEW",
        magnitude: "INTERVIEW",
        frequency: "INTERVIEW",
        population: "EXTERNAL_EVIDENCE",
        attributability: "AI_HYPOTHESIS",
      },
    },
  });
  await prisma.opportunity.update({
    where: { id: noShowOpp.id },
    data: {
      vsImportance: 9,
      vsMagnitude: 6,
      vsFrequency: 8,
      vsPopulation: null, // UNKNOWN — no survey in the demo
      vsAttributability: null, // UNKNOWN — nothing has been tried
      valueDimensionProvenance: {
        importance: "INTERVIEW",
        magnitude: "INTERVIEW",
        frequency: "INTERVIEW",
      },
    },
  });

  // ---- one planned experiment on the first unproven leakage link.
  await prisma.experiment.create({
    data: {
      opportunityId: leakageOpp.id,
      causalLinkId: leakageLadder.link("MECHANISM", "CAPABILITY"),
      assumptionId: a7.id,
      title: "Concierge reconciliation for five salons",
      experimentType: "DATA_FEASIBILITY_TEST",
      hypothesis:
        "Exports from the two most common POS and booking tools are enough to match at least 95% of appointments to payments.",
      decisionQuestion:
        "Can we build the reconciliation mechanism on the data salons actually have?",
      design:
        "Obtain one month of POS and booking exports from five salons; match them by hand; count unmatched appointments and discrepancies found per salon.",
      successMetric: "Share of appointments matched to a payment",
      successThreshold: 95,
      failureThreshold: 80,
      unit: "% of appointments matched",
      population: "5 salons, 8–12 chairs, using the two most common POS / booking tools",
      sampleSize: 5,
      duration: "2 days",
      expectedInformationGain: 8,
      decisionImpact: 9,
      effort: 4,
      costEstimate: "€0 (own time)",
      timeEstimate: "2 days",
      owner: "Founder",
      status: "PLANNED",
    },
  });

  // Derive assumption statuses from links.
  const assumptions = await prisma.assumption.findMany({
    where: { workspaceId: workspace.id },
    include: { links: { include: { evidence: true } } },
  });
  for (const a of assumptions) {
    const derived = deriveAssumptionStatus(
      a.links.map((l) => ({
        direction: l.direction,
        weight: signalWeight(toEvidenceSignal(l.evidence)),
      })),
    );
    await prisma.assumption.update({
      where: { id: a.id },
      data: { status: derived.status, confidence: derived.confidence },
    });
  }

  // Compute scores deterministically. The second pass records what the linked
  // evidence changed (learning history).
  for (const o of allOpps) {
    const r = await recomputeOpportunity(o.id, {
      trigger: "EVIDENCE_LINKED",
      evidenceId: o.id === leakageOpp.id ? e6.id : null,
    });
    console.log(
      `  ${o.title}: potential ${r?.opportunityScore} · evidence ${r?.evidenceScore} · value ${r?.valueStrength ?? "INCOMPLETE"} · causal ${r?.causalConfidence ?? "INCOMPLETE"} · frontier ${r?.proofFrontierRung ?? "NONE"} · ${r?.verdict}`,
    );
  }

  // ---- conversation
  const conversation = await prisma.conversation.create({
    data: {
      workspaceId: workspace.id,
      stage: "RECOMMENDATION",
      userContext: {
        industries: ["Beauty salons", "Local services"],
        audiences: ["Salon owners in my city", "Two stylists I know"],
        businessModel: "B2B",
        productPreferences: ["Software", "AI"],
        avoidIndustries: ["Healthcare regulation"],
        technicalStrengths: ["Full-stack web", "Data pipelines"],
      },
    },
  });
  const msgs: Array<{ role: "USER" | "ASSISTANT"; content: string; payload?: object }> = [
    { role: "USER", content: "I don't know what to build" },
    {
      role: "ASSISTANT",
      content:
        "We start from your context, not from a product.\n\nWhat industries do you understand or have access to?",
    },
    { role: "USER", content: "Beauty salons — my sister runs one and I know a dozen owners." },
    {
      role: "ASSISTANT",
      content:
        "Good: direct access to the ICP is rare and valuable.\n\nMarket (HYPOTHESIS): independent beauty salons, owner-operated, 5–20 employees. The owner is both user and buyer.\n\nWhich people can you realistically talk to in the next two weeks?",
    },
    { role: "USER", content: "Salon owners in my city, B2B, software or AI." },
    {
      role: "ASSISTANT",
      content:
        "ICP: independent salon owner. Economic buyer: UNKNOWN until confirmed.\n\nVariable map (importance 0–10, HYPOTHESIS):\n- No-show rate — 9\n- Employee revenue leakage — 9\n- Idle chair capacity — 8\n- Customer retention — 7\n- Inventory shrinkage — 6\n\nWhich variable should we investigate first?",
    },
    { role: "USER", content: "No-show rate. Owners complain about it constantly." },
    {
      role: "ASSISTANT",
      content:
        "Complaints are a FACT you observed; the economic size is still a HYPOTHESIS.\n\nCurrent state: UNKNOWN (owners estimate 12–20%). Desired state: < 8%. Triggers: Saturday morning no-shows; stylist complaints about lost commission. Alternatives: WhatsApp reminders, phone calls, bundled reminders — none predict risk or resell the slot.\n\nEvidence Confidence is 0 until you capture external evidence. Interview three owners about the last time it happened.",
    },
    {
      role: "USER",
      content:
        "Done — I added three interviews, a competitor review and two Reddit threads as evidence.",
    },
    {
      role: "ASSISTANT",
      content:
        "Two interviews quantify the loss (EVIDENCE: “€1,200 a month”, “€9,000 over six months” on leakage). One Reddit comment contradicts the reminder assumption; it lowers confidence.\n\nMechanisms explored for no-shows: risk prediction, dynamic deposits, waitlist backfill, adaptive reminders, and a non-software cancellation policy. Problem ≠ product.\n\nSeven opportunities are scored deterministically on the Radar. Revenue leakage and no-show prevention justify customer discovery; the loyalty app is contradicted by evidence and should be killed.",
    },
  ];
  for (const m of msgs) {
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: m.role,
        content: m.content,
        payload: m.payload ?? undefined,
      },
    });
  }
}

async function seedDentalIdea(userId: string) {
  const workspace = await prisma.workspace.create({
    data: {
      userId,
      name: "AI receptionist for dental clinics (demo)",
      description:
        "Demo of the 'I already have an idea' flow. The idea is decomposed before it is evaluated.",
      entryMode: "HAS_IDEA",
      ideaStatement: "AI receptionist for dental clinics",
      isDemo: true,
    },
  });
  const market = await prisma.market.create({
    data: {
      workspaceId: workspace.id,
      name: "Dental clinics",
      description: "Independent and small-group dental practices.",
      attractivenessNotes: "UNKNOWN — not yet assessed.",
      provenance: "USER",
    },
  });
  const icp = await prisma.iCP.create({
    data: {
      marketId: market.id,
      name: "Dental practice owner",
      role: "Owner-dentist",
      companyType: "Independent dental clinic",
      companySize: "2–6 chairs",
      economicBuyer: "UNKNOWN — validate whether the owner or the practice manager buys software",
      userRole: "Front-desk staff",
      reachability: "UNKNOWN",
      provenance: "USER",
    },
  });
  await prisma.variable.createMany({
    data: [
      {
        icpId: icp.id,
        name: "Missed calls",
        variableType: "Loss",
        category: "REVENUE",
        desiredDirection: "DECREASE",
        importanceScore: 8,
        description: "Calls not answered during treatments and lunch breaks.",
        provenance: "AI_HYPOTHESIS",
      },
      {
        icpId: icp.id,
        name: "Booking conversion",
        variableType: "Conversion",
        category: "CONVERSION",
        desiredDirection: "INCREASE",
        importanceScore: 8,
        provenance: "AI_HYPOTHESIS",
      },
      {
        icpId: icp.id,
        name: "Front desk labor cost",
        variableType: "Cost",
        category: "COST",
        desiredDirection: "DECREASE",
        importanceScore: 7,
        provenance: "AI_HYPOTHESIS",
      },
      {
        icpId: icp.id,
        name: "Response time",
        category: "TIME",
        desiredDirection: "ACCELERATE",
        importanceScore: 6,
        provenance: "AI_HYPOTHESIS",
      },
      {
        icpId: icp.id,
        name: "No-show rate",
        category: "CAPACITY",
        desiredDirection: "DECREASE",
        importanceScore: 7,
        provenance: "AI_HYPOTHESIS",
      },
    ],
  });
  await prisma.productMechanism.create({
    data: {
      workspaceId: workspace.id,
      name: "AI receptionist",
      category: "AI_AGENT",
      description: "The mechanism proposed by the user. Parked until the problem is understood.",
      provenance: "USER",
    },
  });
  await prisma.assumption.createMany({
    data: [
      {
        workspaceId: workspace.id,
        statement: "Dental clinics lose significant revenue from missed calls.",
        importance: 9,
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        statement: "The owner controls software purchases.",
        importance: 8,
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        statement: "Current receptionist workflows are insufficient.",
        importance: 7,
        provenance: "AI_HYPOTHESIS",
      },
      {
        workspaceId: workspace.id,
        statement: "Clinics would pay $300/month.",
        importance: 8,
        provenance: "AI_HYPOTHESIS",
      },
    ],
  });
  const conversation = await prisma.conversation.create({
    data: { workspaceId: workspace.id, stage: "VARIABLE_DISCOVERY" },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        role: "USER",
        content: "AI receptionist for dental clinics",
      },
      {
        conversationId: conversation.id,
        role: "ASSISTANT",
        content:
          "I will not evaluate the solution yet. Decomposition:\n\n- ICP (from your statement): dental practice owner\n- Market: dental clinics\n- Variables the solution could move (HYPOTHESIS): missed calls 8, booking conversion 8, front desk labor cost 7, response time 6, no-show rate 7\n- Economic buyer: UNKNOWN. Reachability: UNKNOWN.\n\nFour assumptions were added to the ledger. Which variable is the idea really supposed to move?",
        payload: {
          suggestedReplies: [
            "Missed calls",
            "Booking conversion",
            "Front desk labor cost",
            "No-show rate",
          ],
          questionCard: {
            question: "Which variable is the idea really supposed to move?",
            options: [
              "Missed calls",
              "Booking conversion",
              "Front desk labor cost",
              "No-show rate",
            ],
            allowFreeText: true,
          },
        },
      },
    ],
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
