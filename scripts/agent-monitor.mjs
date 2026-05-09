#!/usr/bin/env node
/**
 * Agent Monitor — scans OpenClaw trajectory files to compute per-agent
 * cost, task counts, and last-active timestamps, then POSTs to Mission Control.
 */

import { readdir, readFile } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { homedir } from "os";

const MC_URL    = "http://127.0.0.1:3000/api/agents/state";
const MC_SECRET = "3eb5d0ead0e8b501ea87cbf33d931e13c5f45d2f85193540313c2e502ffe6c87";
const SESSIONS_DIR = join(homedir(), ".openclaw/agents/main/sessions");

// Sonnet 4.6 pricing per million tokens
const PRICE = {
  input:      3.00 / 1_000_000,
  output:    15.00 / 1_000_000,
  cacheRead:  0.30 / 1_000_000,
  cacheWrite: 3.75 / 1_000_000,
};

// Map sessionKey prefixes → agent metadata
const AGENTS = {
  "agent:main:main":            { id: "claw",            name: "Claw",            emoji: "🐾",  role: "CEO" },
  "agent:cody:main":            { id: "cody",            name: "Cody",            emoji: "💻", role: "Coding" },
  "agent:einstein:main":        { id: "einstein",        name: "Einstein",        emoji: "💡", role: "Ideas" },
  "agent:scout:main":           { id: "scout",           name: "Scout",           emoji: "🔍", role: "Research" },
  "agent:michelangelo:main":    { id: "michelangelo",    name: "Michelangelo",    emoji: "🎨", role: "Design" },
  "agent:stephen-hawking:main": { id: "stephen-hawking", name: "Stephen Hawking", emoji: "🏗️", role: "Architecture" },
  "agent:bill-w:main":          { id: "bill-w",          name: "Bill W",          emoji: "🙏", role: "AA" },
};

// Subagents spawned by Claw count toward Claw's total
function agentFromKey(sessionKey) {
  for (const [prefix, meta] of Object.entries(AGENTS)) {
    if (sessionKey === prefix) return meta;
  }
  // Subagents of main session → claw
  if (sessionKey?.startsWith("agent:main:")) return AGENTS["agent:main:main"];
  return null;
}

async function readLines(filePath) {
  const lines = [];
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) lines.push(line);
  }
  return lines;
}

async function scanTrajectories() {
  const stats = {}; // agentId → { totalCost, tasksCompleted, lastActiveMs, meta }

  for (const meta of Object.values(AGENTS)) {
    stats[meta.id] = { totalCost: 0, tasksCompleted: 0, lastActiveMs: 0, meta };
  }

  let files;
  try {
    files = await readdir(SESSIONS_DIR);
  } catch {
    console.error("Sessions dir not found:", SESSIONS_DIR);
    return stats;
  }

  const trajectoryFiles = files.filter(f => f.endsWith(".trajectory.jsonl"));

  for (const file of trajectoryFiles) {
    const path = join(SESSIONS_DIR, file);
    let lines;
    try {
      lines = await readLines(path);
    } catch { continue; }

    let agentId = null;
    let sessionLastActive = 0;
    let sessionCost = 0;
    let sessionRuns = 0;

    for (const line of lines) {
      let event;
      try { event = JSON.parse(line); } catch { continue; }

      // Determine agent from first event that has sessionKey
      if (!agentId && event.sessionKey) {
        agentId = agentFromKey(event.sessionKey)?.id;
      }

      const ts = event.ts ? new Date(event.ts).getTime() : 0;
      if (ts > sessionLastActive) sessionLastActive = ts;

      if (event.type === "model.completed" && event.data?.usage) {
        const u = event.data.usage;
        sessionCost +=
          (u.input       || 0) * PRICE.input +
          (u.output      || 0) * PRICE.output +
          (u.cacheRead   || 0) * PRICE.cacheRead +
          (u.cacheWrite  || 0) * PRICE.cacheWrite;
        sessionRuns++;
      }
    }

    if (!agentId || !stats[agentId]) continue;
    stats[agentId].totalCost       += sessionCost;
    stats[agentId].tasksCompleted  += sessionRuns;
    if (sessionLastActive > stats[agentId].lastActiveMs) {
      stats[agentId].lastActiveMs = sessionLastActive;
    }
  }

  return stats;
}

function deriveStatus(lastActiveMs) {
  if (!lastActiveMs) return "offline";
  const diffMin = (Date.now() - lastActiveMs) / 60000;
  if (diffMin < 10)  return "working";
  if (diffMin < 120) return "online";
  return "offline";
}

async function postAgentState(meta, status, totalCost, tasksCompleted) {
  const res = await fetch(MC_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MC_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: meta.id,
      name: meta.name,
      emoji: meta.emoji,
      role: meta.role,
      status,
      totalCost,
      tasksCompleted,
    }),
  });
  return res.ok;
}

async function main() {
  console.log("🔍 Scanning agent trajectories...");
  const stats = await scanTrajectories();

  for (const [agentId, data] of Object.entries(stats)) {
    const status = deriveStatus(data.lastActiveMs);
    const ok = await postAgentState(data.meta, status, data.totalCost, data.tasksCompleted);
    console.log(`${ok ? "✅" : "❌"} ${agentId}: ${status} | $${data.totalCost.toFixed(4)} | ${data.tasksCompleted} runs`);
  }

  console.log("✅ Done.");
}

main().catch(console.error);
