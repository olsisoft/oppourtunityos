/**
 * Smoke test: drive the discovery pipeline end-to-end against the database
 * using the mock provider. Run with: npx tsx scripts/smoke-discovery.ts
 */
import "dotenv/config";
process.env.AI_PROVIDER = "mock";
process.env.LOG_LEVEL = "warn";

import bcrypt from "bcryptjs";
import { prisma } from "@/db/prisma";
import { getWorkspaceCounts, getWorkspaceGraph } from "@/db/workspaces";
import { runDiscoveryTurn } from "@/services/discovery/turn";

async function turn(workspaceId: string, message: string, entryMode?: "NO_IDEA" | "HAS_IDEA") {
  let text = "";
  let stage = "";
  for await (const ev of runDiscoveryTurn({ workspaceId, message, entryMode })) {
    if (ev.type === "text") text += ev.delta;
    if (ev.type === "state") stage = ev.stage;
    if (ev.type === "error") throw new Error(ev.message);
  }
  console.log(
    `\n> ${message}\n< ${text.split("\n").slice(0, 3).join(" | ").slice(0, 160)}...\n  stage → ${stage}`,
  );
}

async function main() {
  const email = `smoke-${Date.now()}@example.com`;
  const user = await prisma.user.create({
    data: { email, name: "Smoke", passwordHash: await bcrypt.hash("password123", 10) },
  });
  const ws = await prisma.workspace.create({ data: { userId: user.id, name: "Smoke: dental" } });

  await turn(ws.id, "AI receptionist for dental clinics", "HAS_IDEA");
  await turn(ws.id, "Missed calls");
  await turn(ws.id, "It happens weekly and costs real money");
  await turn(ws.id, "Continue with hypotheses for now");
  await turn(ws.id, "Risk prediction for missed calls");

  const counts = await getWorkspaceCounts(ws.id);
  console.log("\ncounts", counts);
  const graph = await getWorkspaceGraph(ws.id);
  for (const o of graph.opportunities) {
    console.log(
      `opportunity "${o.title}": potential ${o.opportunityScore}, evidence ${o.evidenceScore}, verdict ${o.verdict}`,
    );
    console.log(
      "  kill warnings:",
      (o.killWarnings as Array<{ code: string }>).map((w) => w.code).join(", "),
    );
  }
  console.log(
    "assumptions:",
    graph.assumptions.length,
    "messages:",
    graph.conversations[0].messages.length,
    "stage:",
    graph.conversations[0].stage,
  );

  // Second workspace: NO_IDEA flow
  const ws2 = await prisma.workspace.create({ data: { userId: user.id, name: "Smoke: no idea" } });
  await turn(ws2.id, "I don't know what to build", "NO_IDEA");
  await turn(ws2.id, "Beauty salons and restaurants");
  await turn(ws2.id, "Small business owners");
  await turn(ws2.id, "B2B");
  await turn(ws2.id, "Independent beauty salons");
  await turn(ws2.id, "Beauty salon owner");
  await turn(ws2.id, "No-show rate");
  const counts2 = await getWorkspaceCounts(ws2.id);
  console.log("\ncounts2", counts2);

  await prisma.user.delete({ where: { id: user.id } });
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
