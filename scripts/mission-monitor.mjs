/**
 * Mission Monitor — checks for stalled/failed missions and writes alerts.
 *
 * Run via cron or manually:
 *   node scripts/mission-monitor.mjs
 *
 * Output: writes /tmp/mission-alerts.json if issues found, and prints JSON to stdout.
 * Claw can read /tmp/mission-alerts.json on heartbeat to surface alerts.
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync } from "fs";

const prisma = new PrismaClient();

const STALL_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

const stalled = await prisma.missionStep.findMany({
  where: {
    status: "active",
    startedAt: { lt: new Date(Date.now() - STALL_THRESHOLD_MS) },
  },
  include: { mission: true },
});

const failed = await prisma.mission.findMany({
  where: {
    status: "failed",
    completedAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  },
});

if (stalled.length > 0 || failed.length > 0) {
  const alerts = {
    generatedAt: new Date().toISOString(),
    stalled: stalled.map((s) => ({
      missionId: s.mission.id,
      mission: s.mission.title,
      stepId: s.id,
      step: s.title,
      agent: s.agentId,
      stalledSince: s.startedAt,
    })),
    failed: failed.map((m) => ({
      missionId: m.id,
      mission: m.title,
      agent: m.agentId,
      failedAt: m.completedAt,
    })),
  };

  writeFileSync("/tmp/mission-alerts.json", JSON.stringify(alerts, null, 2));
  process.stdout.write(JSON.stringify(alerts) + "\n");
} else {
  process.stdout.write(
    JSON.stringify({ generatedAt: new Date().toISOString(), stalled: [], failed: [] }) + "\n"
  );
}

await prisma.$disconnect();
