import fs from "fs";
import { prisma } from "@/lib/prisma";
import { Bot, ListTodo, Lightbulb, Activity } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

// ── Cron health ──────────────────────────────────────────────────────────────

interface CronErrorJob {
  id: string;
  name: string;
  agentId?: string;
  enabled: boolean;
  lastError?: string | null;
  lastDiagnosticSummary?: string | null;
  consecutiveErrors?: number;
}

const AGENT_INFO: Record<string, { name: string; emoji: string }> = {
  main: { name: "Claw", emoji: "🐾" },
  "bill-w": { name: "Bill W.", emoji: "📖" },
  einstein: { name: "Einstein", emoji: "💡" },
  cody: { name: "Kodee", emoji: "💻" },
  kodee: { name: "Kodee", emoji: "💻" },
  scout: { name: "Scout", emoji: "🔍" },
  michelangelo: { name: "Michelangelo", emoji: "🎨" },
  "stephen-hawking": { name: "Stephen Hawking", emoji: "🔬" },
};

function agentInfo(agentId: string) {
  return AGENT_INFO[agentId] ?? { name: agentId, emoji: "🤖" };
}

function getCronErrors(): CronErrorJob[] {
  try {
    const jobsDefs: CronErrorJob[] = JSON.parse(
      fs.readFileSync("/Users/glenha/.openclaw/cron/jobs.json", "utf-8")
    ).jobs ?? [];
    const stateMap: Record<string, { state: Record<string, unknown> }> = (() => {
      try {
        return JSON.parse(
          fs.readFileSync("/Users/glenha/.openclaw/cron/jobs-state.json", "utf-8")
        ).jobs ?? {};
      } catch { return {}; }
    })();
    return jobsDefs
      .map((job) => {
        const st = stateMap[job.id]?.state ?? {};
        return {
          ...job,
          lastError: (st.lastError as string) ?? null,
          lastDiagnosticSummary: (st.lastDiagnosticSummary as string) ?? null,
          consecutiveErrors: (st.consecutiveErrors as number) ?? 0,
        };
      })
      .filter((j) => j.lastError || j.lastDiagnosticSummary);
  } catch { return []; }
}

// ── Stats ─────────────────────────────────────────────────────────────────────

async function getStats() {
  try {
    const [agents, pendingMissions, pendingIdeas] = await Promise.all([
      prisma.agentState.findMany({ orderBy: { updatedAt: "desc" } }),
      prisma.mission.count({ where: { status: "pending" } }),
      prisma.idea.count({ where: { status: "pending" } }),
    ]);
    const online = agents.filter((a) => a.status === "online" || a.status === "working").length;
    const totalCost = agents.reduce((s, a) => s + (a.totalCost || 0), 0);
    const totalTasks = agents.reduce((s, a) => s + (a.tasksCompleted || 0), 0);
    const cronErrors = getCronErrors();
    return { agents, online, total: agents.length, totalCost, totalTasks, pendingMissions, pendingIdeas, cronErrors };
  } catch {
    return { agents: [], online: 0, total: 0, totalCost: 0, totalTasks: 0, pendingMissions: 0, pendingIdeas: 0, cronErrors: [] as CronErrorJob[] };
  }
}

export default async function HomePage() {
  const s = await getStats();
  const empty = s.total === 0;

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-2">Xenler Mission Control</h1>
      <p className="text-[var(--ink-2)] mb-8">
        Every agent in your OpenClaw stack, at a glance.
      </p>

      {empty && (
        <div
          className="mb-6 p-5 rounded-xl"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          <div className="text-[14px] font-medium mb-1">No agents yet.</div>
          <div className="text-[13px] text-[var(--ink-2)]">
            Run{" "}
            <code className="px-1.5 py-0.5 rounded" style={{ background: "#000", color: "var(--accent)" }}>
              npm run seed:demo
            </code>{" "}
            to populate sample agents, or wire your OpenClaw agents to POST to{" "}
            <code className="px-1.5 py-0.5 rounded" style={{ background: "#000" }}>/api/agents/state</code>.
          </div>
        </div>
      )}

      {/* Cron alert panel — only shows when there are errors */}
      {s.cronErrors.length > 0 && (
        <div
          className="mb-8 rounded-xl overflow-hidden"
          style={{ border: "1px solid rgba(220,50,50,0.4)", background: "rgba(220,50,50,0.04)" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{
              background: "rgba(220,50,50,0.12)",
              borderBottom: "1px solid rgba(220,50,50,0.3)",
              borderLeft: "4px solid rgba(220,50,50,0.8)",
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-[16px]">⚠️</span>
              <span className="text-[14px] font-semibold" style={{ color: "#e55" }}>
                {s.cronErrors.length} cron job{s.cronErrors.length !== 1 ? "s" : ""} need attention
              </span>
            </div>
            <Link href="/crons" className="text-[12px]" style={{ color: "#e55", opacity: 0.8 }}>
              View all →
            </Link>
          </div>
          <div className="flex flex-col divide-y" style={{ borderColor: "rgba(220,50,50,0.15)" }}>
            {s.cronErrors.map((job) => {
              const { name: aName, emoji: aEmoji } = agentInfo(job.agentId ?? "unknown");
              const msg = job.lastDiagnosticSummary || job.lastError || "";
              return (
                <div key={job.id} className="px-4 py-3" style={{ borderColor: "rgba(220,50,50,0.15)" }}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px]">{aEmoji}</span>
                    <span className="text-[12px] font-medium" style={{ color: "var(--ink-3)" }}>{aName}</span>
                    <span style={{ color: "rgba(220,50,50,0.5)" }}>·</span>
                    <span className="text-[13px] font-semibold text-[var(--ink)]">{job.name}</span>
                    {!job.enabled && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] ml-1" style={{ background: "#3a3a3a", color: "var(--ink-3)" }}>disabled</span>
                    )}
                  </div>
                  <p className="text-[12.5px] leading-relaxed break-words" style={{ color: "var(--ink-2)" }}>{msg}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-8">
        <Kpi icon={<Bot className="w-4 h-4" />} label="Agents online" value={`${s.online} / ${s.total}`} />
        <Kpi icon={<Activity className="w-4 h-4" />} label="Tasks completed" value={s.totalTasks.toLocaleString()} />
        <Kpi icon={<ListTodo className="w-4 h-4" />} label="Pending missions" value={String(s.pendingMissions)} />
        <Kpi icon={<Lightbulb className="w-4 h-4" />} label="Ideas to review" value={String(s.pendingIdeas)} />
      </div>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[16px] font-semibold">Agents</h2>
        <Link href="/agents" className="text-[13px] text-[var(--ink-2)] hover:text-[var(--ink)]">
          View all →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {s.agents.slice(0, 6).map((a) => (
          <div
            key={a.id}
            className="p-4 rounded-xl flex items-center gap-3"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div className="text-2xl">{a.emoji || "🤖"}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="font-medium text-[14px] truncate">{a.name}</div>
                <StatusDot status={a.status} />
              </div>
              <div className="text-[12px] text-[var(--ink-3)] truncate">
                {a.currentTask || a.role || "Idle"}
              </div>
            </div>
            <div className="text-right text-[12px] text-[var(--ink-3)]">
              <div>{a.tasksCompleted} tasks</div>
              <div>${(a.totalCost || 0).toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Kpi({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div
      className="p-4 rounded-xl flex flex-col gap-1"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
        {icon}
        {label}
      </div>
      <div className="text-[22px] font-semibold tracking-[-0.01em]">{value}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "online" || status === "working"
      ? "bg-emerald-500"
      : status === "error"
      ? "bg-red-500"
      : status === "idle"
      ? "bg-amber-500"
      : "bg-zinc-600";
  return <div className={`w-1.5 h-1.5 rounded-full ${color}`} />;
}
