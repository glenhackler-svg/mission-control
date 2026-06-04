#!/usr/bin/env node
/**
 * Agent Monitor — scans OpenClaw trajectory files to compute per-agent
 * cost, task counts, and last-active timestamps, then POSTs to Mission Control.
 * Also scans Claw sessions for sessions_spawn calls and auto-creates/updates
 * delegation records in Mission Control.
 */

import { readdir, readFile } from "fs/promises";
import { createReadStream } from "fs";
import { createInterface } from "readline";
import { join } from "path";
import { homedir } from "os";

const MC_URL       = "http://127.0.0.1:3000/api/agents/state";
const DELEG_URL    = "http://127.0.0.1:3000/api/delegations";
const MC_SECRET    = process.env.INTERNAL_API_SECRET ?? (() => { throw new Error("INTERNAL_API_SECRET env var is required"); })();
const AGENTS_DIR   = join(homedir(), ".openclaw/agents");
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
  "agent:kodee:main":           { id: "kodee",           name: "Kodee",           emoji: "💻", role: "Coding" },
  "agent:cody:main":            { id: "kodee",           name: "Kodee",           emoji: "💻", role: "Coding" },
  "agent:einstein:main":        { id: "einstein",        name: "Einstein",        emoji: "💡", role: "Ideas" },
  "agent:scout:main":           { id: "scout",           name: "Scout",           emoji: "🔍", role: "Research" },
  "agent:michelangelo:main":    { id: "michelangelo",    name: "Michelangelo",    emoji: "🎨", role: "Design" },
  "agent:stephen-hawking:main": { id: "stephen-hawking", name: "Stephen Hawking", emoji: "🏗️", role: "Architecture" },
  "agent:bill-w:main":          { id: "bill-w",          name: "Bill W",          emoji: "🙏", role: "AA" },
};

// Map system agent IDs → display agent IDs for Mission Control
const AGENT_SYSTEM_ID_MAP = {
  "cody":            "kodee",
  "kodee":           "kodee",
  "main":            "claw",
  "scout":           "scout",
  "einstein":        "einstein",
  "michelangelo":    "michelangelo",
  "stephen-hawking": "stephen-hawking",
  "bill-w":          "bill-w",
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
  try {
    const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
    for await (const line of rl) {
      if (line.trim()) lines.push(line);
    }
  } catch {
    // ignore read errors
  }
  return lines;
}

/**
 * Compute cost from an array of trajectory JSONL lines.
 */
function computeCostFromLines(lines) {
  let cost = 0;
  let lastActiveMs = 0;
  let hasEnded = false;

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }

    const ts = event.ts ? new Date(event.ts).getTime() : 0;
    if (ts > lastActiveMs) lastActiveMs = ts;

    if (event.type === "model.completed" && event.data?.usage) {
      const u = event.data.usage;
      cost +=
        (u.input       || 0) * PRICE.input +
        (u.output      || 0) * PRICE.output +
        (u.cacheRead   || 0) * PRICE.cacheRead +
        (u.cacheWrite  || 0) * PRICE.cacheWrite;
    }

    if (event.type === "session.ended") hasEnded = true;
  }

  return { cost, lastActiveMs, hasEnded };
}

/**
 * Parse sessions_spawn meta string into structured fields.
 * Formats seen:
 *   "label {label}, task {task}, agent {agentId}"
 *   "label {label}, task {task}"
 *   "{task}"  (no label)
 */
function parseSpawnMeta(meta) {
  if (!meta) return { label: null, task: meta || "", agentHint: null };

  // Try "label X, task Y, agent Z"
  const fullMatch = meta.match(/^label\s+(.+?),\s+task\s+([\s\S]+?)(?:,\s+agent\s+(\S+))?$/);
  if (fullMatch) {
    return {
      label:     fullMatch[1].trim(),
      task:      fullMatch[2].trim(),
      agentHint: fullMatch[3]?.trim() || null,
    };
  }

  return { label: null, task: meta.trim(), agentHint: null };
}

/**
 * Scan a trajectory file for sessions_spawn events in trace.artifacts.
 * Returns array of spawn descriptors.
 */
async function findSpawnsInSession(filePath, sessionId) {
  const lines = await readLines(filePath);
  const spawns = [];

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }

    if (event.type !== "trace.artifacts") continue;
    const metas = event.data?.toolMetas || [];
    let spawnIdx = 0;

    for (const m of metas) {
      if (m.toolName !== "sessions_spawn") continue;

      const { label, task, agentHint } = parseSpawnMeta(m.meta || "");
      const key = label
        ? `${sessionId}::${label}`
        : `${sessionId}::idx${spawnIdx}`;

      spawns.push({
        key,
        parentSessionId: sessionId,
        label,
        task,
        agentHint,
        ts: event.ts,
      });
      spawnIdx++;
    }
  }

  // Deduplicate by key (same label in same session = same delegation)
  const seen = new Set();
  return spawns.filter(s => {
    if (seen.has(s.key)) return false;
    seen.add(s.key);
    return true;
  });
}

/**
 * Find all trajectory files in a given agent's sessions directory.
 */
async function listTrajectoryFiles(agentSystemId) {
  const dir = join(AGENTS_DIR, agentSystemId, "sessions");
  try {
    const files = await readdir(dir);
    return files
      .filter(f => f.endsWith(".trajectory.jsonl"))
      .map(f => ({ path: join(dir, f), sessionId: f.replace(".trajectory.jsonl", "") }));
  } catch {
    return [];
  }
}

/**
 * Extract label + requester from a child agent's trajectory file.
 * These are embedded in the system prompt within context.compiled events.
 */
async function getChildSessionInfo(filePath) {
  const lines = await readLines(filePath);
  let label = null;
  let requester = null;
  let sessionKey = null;
  let firstTs = null;

  for (const line of lines) {
    let event;
    try { event = JSON.parse(line); } catch { continue; }

    if (!firstTs && event.ts) firstTs = event.ts;
    if (!sessionKey && event.sessionKey) sessionKey = event.sessionKey;

    if (event.type === "context.compiled" || event.type === "prompt.submitted") {
      const s = JSON.stringify(event.data || {});
      if (!label) {
        // In JSON-serialized strings, newlines appear as \\n (backslash + n)
        const m = s.match(/Label: (.*?)(?:\\\\n|\\\\r|")/);
        label = m?.[1]?.trim() || null;
      }
      if (!requester) {
        // Match session key like agent:main:main
        const m = s.match(/Requester session: (agent:[a-zA-Z0-9:_-]+)/);
        requester = m?.[1]?.trim() || null;
      }
      if (label) break; // found what we need
    }
  }

  return { label, requester, sessionKey, firstTs };
}

/**
 * Scan all agent sessions for subagent sessions (ones with label + requester in system prompt).
 * Returns a map: label → child session info.
 */
async function buildChildSessionIndex() {
  const index = new Map(); // label → { sessionId, agentSystemId, filePath, firstTs, sessionKey, cost, hasEnded }

  // List all agent dirs
  let agentDirs;
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    agentDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return index;
  }

  for (const agentId of agentDirs) {
    const files = await listTrajectoryFiles(agentId);
    for (const { path, sessionId } of files) {
      const info = await getChildSessionInfo(path);
      if (!info.label) continue; // not a spawned subagent session

      const lines = await readLines(path);
      const { cost, hasEnded } = computeCostFromLines(lines);

      const key = info.label;
      // Keep most recent if multiple sessions share a label
      if (!index.has(key) || new Date(info.firstTs) > new Date(index.get(key).firstTs)) {
        index.set(key, {
          sessionId,
          agentSystemId: agentId,
          filePath: path,
          firstTs: info.firstTs,
          sessionKey: info.sessionKey,
          requester: info.requester,
          cost,
          hasEnded,
        });
      }
    }
  }

  return index;
}

/**
 * Compute cost for a single Claw session (the specific session file).
 */
async function computeParentSessionCost(sessionId) {
  const filePath = join(SESSIONS_DIR, `${sessionId}.trajectory.jsonl`);
  const lines = await readLines(filePath);
  const { cost } = computeCostFromLines(lines);
  return cost;
}

/**
 * Get all existing delegation records from Mission Control.
 */
async function getExistingDelegations() {
  try {
    const res = await fetch(`${DELEG_URL}?limit=200`);
    if (!res.ok) return new Map();
    const data = await res.json();
    const map = new Map();
    for (const d of (data.delegations || [])) {
      if (d.notes) map.set(d.notes, d); // use notes as spawn key storage
    }
    return map;
  } catch {
    return new Map();
  }
}

/**
 * Create a delegation record in Mission Control.
 */
async function createDelegation({ title, parentAgentId, childAgentId, parentSessionCost, childSessionCost, status, notes }) {
  const res = await fetch(DELEG_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${MC_SECRET}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({ title, parentAgentId, childAgentId, notes, status }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST /api/delegations failed: ${res.status} ${text}`);
  }
  const data = await res.json();

  // Update costs right away
  const id = data.delegation?.id;
  if (id && (parentSessionCost > 0 || childSessionCost > 0)) {
    await updateDelegationCosts(id, parentSessionCost, childSessionCost, status);
  }

  return data.delegation;
}

/**
 * Update costs/status on an existing delegation.
 */
async function updateDelegationCosts(id, parentSessionCost, childSessionCost, status) {
  const res = await fetch(`${DELEG_URL}/${id}`, {
    method: "PATCH",
    headers: {
      "Authorization": `Bearer ${MC_SECRET}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify({
      ...(Number.isFinite(parentSessionCost) && parentSessionCost > 0 && { parentSessionCost }),
      ...(Number.isFinite(childSessionCost)  && childSessionCost  > 0 && { childSessionCost }),
      status,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH /api/delegations/${id} failed: ${res.status} ${text}`);
  }
  return (await res.json()).delegation;
}

/**
 * Main delegation scanning logic.
 */
async function scanDelegations() {
  console.log("🔗 Scanning for delegations...");

  // Build index of child subagent sessions (by spawn label)
  const childIndex = await buildChildSessionIndex();
  console.log(`   Found ${childIndex.size} child subagent session(s)`);

  // Get existing delegations (keyed by spawn key stored in notes)
  const existing = await getExistingDelegations();
  console.log(`   ${existing.size} existing delegation record(s) in MC`);

  // Find all Claw sessions with sessions_spawn events
  let clawFiles;
  try {
    const files = await readdir(SESSIONS_DIR);
    clawFiles = files.filter(f => f.endsWith(".trajectory.jsonl"));
  } catch {
    console.error("   Could not read main sessions dir");
    return;
  }

  let created = 0, updated = 0, skipped = 0;

  for (const file of clawFiles) {
    const sessionId = file.replace(".trajectory.jsonl", "");
    const filePath = join(SESSIONS_DIR, file);

    let spawns;
    try {
      spawns = await findSpawnsInSession(filePath, sessionId);
    } catch {
      continue;
    }

    if (spawns.length === 0) continue;

    const parentCost = await computeParentSessionCost(sessionId);

    for (const spawn of spawns) {
      const { key, label, task, agentHint, ts } = spawn;

      // Find matching child session
      const child = label ? childIndex.get(label) : null;

      // Determine child agent ID
      let childAgentId = "kodee"; // default
      if (child?.agentSystemId) {
        childAgentId = AGENT_SYSTEM_ID_MAP[child.agentSystemId] || child.agentSystemId;
      } else if (agentHint) {
        childAgentId = AGENT_SYSTEM_ID_MAP[agentHint.toLowerCase()] || agentHint.toLowerCase();
      } else {
        // Try to detect agent from task text: "You are Scout, ..." or "You are Kodee, ..."
        const agentInTask = task.match(/^You are ([A-Za-z]+(?:-[A-Za-z]+)?)/i)?.[1]?.toLowerCase();
        const TASK_AGENT_MAP = {
          kodee: "kodee", cody: "kodee", scout: "scout",
          einstein: "einstein", michelangelo: "michelangelo",
          hawking: "stephen-hawking", "stephen-hawking": "stephen-hawking",
          "bill-w": "bill-w", "bill": "bill-w",
        };
        if (agentInTask && TASK_AGENT_MAP[agentInTask]) {
          childAgentId = TASK_AGENT_MAP[agentInTask];
        }
      }

      const childCost    = child?.cost    || 0;
      const childEnded   = child?.hasEnded ?? false;
      const status       = childEnded ? "completed" : "in_progress";
      const title        = task.length > 100 ? task.slice(0, 97) + "..." : task;

      // Use spawn key as stable notes field for dedup
      const notesKey = `spawn::${key}`;

      if (existing.has(notesKey)) {
        // Update existing record if costs changed
        const rec = existing.get(notesKey);
        const needsUpdate =
          Math.abs((rec.parentSessionCost || 0) - parentCost) > 0.000001 ||
          Math.abs((rec.childSessionCost  || 0) - childCost)  > 0.000001 ||
          rec.status !== status;

        if (needsUpdate) {
          try {
            await updateDelegationCosts(rec.id, parentCost, childCost, status);
            console.log(`   ✏️  Updated delegation [${label || key}] → $${(parentCost + childCost).toFixed(4)}`);
            updated++;
          } catch (e) {
            console.error(`   ❌ Update failed for ${rec.id}: ${e.message}`);
          }
        } else {
          skipped++;
        }
        continue;
      }

      // Create new delegation record
      try {
        await createDelegation({
          title,
          parentAgentId: "claw",
          childAgentId,
          parentSessionCost: parentCost,
          childSessionCost: childCost,
          status,
          notes: notesKey,
        });
        console.log(`   ✅ Created delegation [${label || key}] ${childAgentId} → $${(parentCost + childCost).toFixed(4)}`);
        created++;
      } catch (e) {
        console.error(`   ❌ Create failed for [${label || key}]: ${e.message}`);
      }
    }
  }

  console.log(`🔗 Delegations: ${created} created, ${updated} updated, ${skipped} unchanged`);
}

async function scanTrajectories() {
  const stats = {}; // agentId → { totalCost, tasksCompleted, lastActiveMs, meta }

  for (const meta of Object.values(AGENTS)) {
    if (!stats[meta.id]) {
      stats[meta.id] = { totalCost: 0, tasksCompleted: 0, lastActiveMs: 0, meta };
    }
  }

  // Scan all agent session directories
  let agentDirs;
  try {
    const entries = await readdir(AGENTS_DIR, { withFileTypes: true });
    agentDirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    agentDirs = ["main"]; // fallback
  }

  for (const agentSystemId of agentDirs) {
    const dir = join(AGENTS_DIR, agentSystemId, "sessions");
    let files;
    try {
      files = await readdir(dir);
    } catch { continue; }

    const trajectoryFiles = files.filter(f => f.endsWith(".trajectory.jsonl"));

    for (const file of trajectoryFiles) {
      const path = join(dir, file);
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
          // If not found, try mapping from agent dir name
          if (!agentId) {
            agentId = AGENT_SYSTEM_ID_MAP[agentSystemId] || null;
          }
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

  console.log();
  await scanDelegations();

  console.log("\n✅ Done.");
}

main().catch(console.error);
