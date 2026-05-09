/**
 * Seeds Glen's real OpenClaw agents into Mission Control.
 * Clears demo agents first, then upserts real ones.
 * Run with: npx tsx scripts/seed-glen-agents.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_IDS = ["content-writer", "research-analyst", "growth-scout", "inbox-triage"];

const AGENTS = [
  {
    id: "claw",
    name: "Claw",
    emoji: "🐾",
    role: "CEO",
    status: "online",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: "Standing by",
  },
  {
    id: "kodee",
    name: "Kodee",
    emoji: "💻",
    role: "Coding",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
  {
    id: "einstein",
    name: "Einstein",
    emoji: "💡",
    role: "Ideas",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
  {
    id: "scout",
    name: "Scout",
    emoji: "🔎",
    role: "Research",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
  {
    id: "michelangelo",
    name: "Michelangelo",
    emoji: "🎨",
    role: "Design",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
  {
    id: "stephen-hawking",
    name: "Stephen Hawking",
    emoji: "🏗️",
    role: "Architecture",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
  {
    id: "bill-w",
    name: "Bill W.",
    emoji: "🙏",
    role: "AA",
    status: "idle",
    tasksCompleted: 0,
    totalCost: 0,
    currentTask: null,
  },
];

async function main() {
  console.log("Removing demo agents...");
  await prisma.agentState.deleteMany({ where: { id: { in: DEMO_IDS } } });

  console.log("Seeding Glen's agents...");
  for (const a of AGENTS) {
    await prisma.agentState.upsert({
      where: { id: a.id },
      create: { ...a, lastActive: new Date() },
      update: { ...a, lastActive: new Date() },
    });
  }
  console.log(`  ${AGENTS.length} agents seeded`);
  console.log("Done.");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
