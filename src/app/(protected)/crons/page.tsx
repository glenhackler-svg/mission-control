import fs from "fs";

export const dynamic = "force-dynamic";

// ── Types ─────────────────────────────────────────────────────────────────────

interface CronSchedule {
  kind: "cron" | "every" | "at";
  expr?: string;
  tz?: string;
  everyMs?: number;
  anchorMs?: number;
  at?: string;
}

interface CronJob {
  id: string;
  name: string;
  enabled: boolean;
  agentId?: string;
  schedule: CronSchedule;
  sessionTarget?: string;
  payload?: { kind: string };
  deleteAfterRun?: boolean;
  // merged from state file
  lastRunStatus?: "ok" | "error" | null;
  lastRunAtMs?: number | null;
  nextRunAtMs?: number | null;
  consecutiveErrors?: number;
  consecutiveSkipped?: number;
  lastError?: string | null;
  lastDurationMs?: number | null;
  lastDiagnosticSummary?: string | null;
}

// ── Agent Display Info ────────────────────────────────────────────────────────

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

function agentDisplayInfo(agentId: string): { name: string; emoji: string } {
  return AGENT_INFO[agentId] ?? { name: agentId, emoji: "🤖" };
}

// ── File Reading ──────────────────────────────────────────────────────────────

function readCronJobs(): CronJob[] {
  const jobsPath = "/Users/glenha/.openclaw/cron/jobs.json";
  const statePath = "/Users/glenha/.openclaw/cron/jobs-state.json";

  let jobsDefs: CronJob[] = [];
  let stateMap: Record<string, { state: Record<string, unknown> }> = {};

  try {
    const raw = fs.readFileSync(jobsPath, "utf-8");
    const parsed = JSON.parse(raw);
    jobsDefs = parsed.jobs ?? [];
  } catch {
    return [];
  }

  try {
    const raw = fs.readFileSync(statePath, "utf-8");
    const parsed = JSON.parse(raw);
    stateMap = parsed.jobs ?? {};
  } catch {
    // state file might not exist — fine
  }

  return jobsDefs.map((job) => {
    const stateEntry = stateMap[job.id];
    const st = stateEntry?.state ?? {};
    return {
      ...job,
      lastRunStatus: (st.lastRunStatus as "ok" | "error" | null) ?? null,
      lastRunAtMs: (st.lastRunAtMs as number) ?? null,
      nextRunAtMs: (st.nextRunAtMs as number) ?? null,
      consecutiveErrors: (st.consecutiveErrors as number) ?? 0,
      consecutiveSkipped: (st.consecutiveSkipped as number) ?? 0,
      lastError: (st.lastError as string) ?? null,
      lastDurationMs: (st.lastDurationMs as number) ?? null,
      lastDiagnosticSummary: (st.lastDiagnosticSummary as string) ?? null,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(ms: number | null | undefined, now: number): string {
  if (!ms) return "Never";
  const diff = ms - now;
  const abs = Math.abs(diff);
  const seconds = Math.floor(abs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let str: string;
  if (seconds < 60) str = `${seconds}s`;
  else if (minutes < 60) str = `${minutes}m`;
  else if (hours < 24) str = `${hours}h`;
  else str = `${days}d`;

  return diff < 0 ? `${str} ago` : `in ${str}`;
}

function formatDuration(ms: number | null | undefined): string {
  if (!ms) return "-";
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remSec = seconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return remSec === 0 ? `${minutes}m` : `${minutes}m ${remSec}s`;
}

function parseCronToHuman(expr: string, tz?: string): string {
  const tzLabel = tz ? tz.replace("America/Los_Angeles", "PT").replace("America/New_York", "ET") : "";
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return expr;
  const [minute, hour, dom, month, dow] = parts;

  const pad = (n: string) => n.padStart(2, "0");
  const hourNum = parseInt(hour, 10);
  const minNum = parseInt(minute, 10);
  const timeStr = isNaN(hourNum) || isNaN(minNum) ? null :
    `${hourNum % 12 === 0 ? 12 : hourNum % 12}:${pad(minute)} ${hourNum < 12 ? "AM" : "PM"}${tzLabel ? " " + tzLabel : ""}`;

  if (minute !== "*" && hour !== "*" && dom === "*" && month === "*" && dow === "*") {
    return `Daily at ${timeStr}`;
  }
  if (minute === "0" && hour === "*/1" && dom === "*" && month === "*" && dow === "*") {
    return "Every hour";
  }
  if (minute !== "*" && hour !== "*" && dom !== "*" && month === "*" && dow === "*") {
    return `Monthly on day ${dom} at ${timeStr}`;
  }
  if (minute !== "*" && hour !== "*" && dom === "*" && month === "*" && dow !== "*") {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayIdx = parseInt(dow, 10);
    const dayName = isNaN(dayIdx) ? dow : (days[dayIdx] ?? dow);
    return `Weekly ${dayName} at ${timeStr}`;
  }
  return expr;
}

function scheduleLabel(schedule: CronSchedule): string {
  if (schedule.kind === "cron") {
    return parseCronToHuman(schedule.expr ?? "", schedule.tz);
  }
  if (schedule.kind === "every") {
    const ms = schedule.everyMs ?? 0;
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours >= 1 && minutes % 60 === 0) return `Every ${hours}h`;
    if (minutes >= 1) return `Every ${minutes} min`;
    return `Every ${seconds}s`;
  }
  if (schedule.kind === "at") {
    const d = new Date(schedule.at ?? "");
    if (isNaN(d.getTime())) return "One-shot";
    const label = d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/Los_Angeles",
      timeZoneName: "short",
    });
    return `One-shot: ${label}`;
  }
  return "Unknown";
}

// ── Job Row ───────────────────────────────────────────────────────────────────

function JobRow({ job, now }: { job: CronJob; now: number }) {
  const hasError = (job.consecutiveErrors ?? 0) > 0;
  const isDisabled = !job.enabled;

  let statusBadge: React.ReactNode;
  if (isDisabled) {
    statusBadge = (
      <span
        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: "#3a3a3a", color: "var(--ink-3)" }}
      >
        ⏸ Disabled
      </span>
    );
  } else if (job.lastRunStatus === "error" || hasError) {
    statusBadge = (
      <span
        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: "rgba(220,50,50,0.15)", color: "#e55" }}
      >
        ❌ Error
      </span>
    );
  } else if (job.lastRunStatus === "ok") {
    statusBadge = (
      <span
        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: "rgba(34,197,94,0.15)", color: "#4ade80" }}
      >
        ✅ OK
      </span>
    );
  } else {
    statusBadge = (
      <span
        className="px-2 py-0.5 rounded-full text-[11px] font-medium"
        style={{ background: "var(--panel)", color: "var(--ink-3)" }}
      >
        — Pending
      </span>
    );
  }

  const nextRunDisplay = isDisabled || job.schedule.kind === "at"
    ? "N/A"
    : relativeTime(job.nextRunAtMs, now);

  return (
    <tr
      key={job.id}
      className="border-t"
      style={{
        borderColor: "var(--line)",
        ...(hasError
          ? {
              borderLeft: "3px solid rgba(220,50,50,0.6)",
              background: "rgba(220,50,50,0.04)",
            }
          : {}),
      }}
    >
      <td className="p-3">
        <div className="font-medium text-[var(--ink)]">{job.name}</div>
        <div className="text-[11.5px] text-[var(--ink-3)] mt-0.5">
          {scheduleLabel(job.schedule)}
        </div>
      </td>
      <td className="p-3">
        {job.sessionTarget ? (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            {job.sessionTarget}
          </span>
        ) : (
          <span className="text-[var(--ink-3)]">-</span>
        )}
      </td>
      <td className="p-3">{statusBadge}</td>
      <td className="p-3 text-[var(--ink-2)]">
        {relativeTime(job.lastRunAtMs, now)}
      </td>
      <td className="p-3 text-[var(--ink-2)]">{nextRunDisplay}</td>
      <td className="p-3 text-[var(--ink-2)]">
        {formatDuration(job.lastDurationMs)}
      </td>
      <td className="p-3">
        {(job.consecutiveErrors ?? 0) > 0 ? (
          <span
            className="px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: "rgba(234,179,8,0.15)", color: "#facc15" }}
          >
            {job.consecutiveErrors}
          </span>
        ) : (
          <span className="text-[var(--ink-3)]">0</span>
        )}
      </td>
    </tr>
  );
}

// ── Agent Section ─────────────────────────────────────────────────────────────

function AgentSection({ agentId, jobs, now }: { agentId: string; jobs: CronJob[]; now: number }) {
  const { name, emoji } = agentDisplayInfo(agentId);

  return (
    <div className="mb-10">
      {/* Section header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-[20px]">{emoji}</span>
        <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--ink)]">
          {name}
        </h2>
        <span
          className="text-[11px] text-[var(--ink-3)] font-mono px-1.5 py-0.5 rounded"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          {agentId}
        </span>
        <div className="flex-1 h-px ml-1" style={{ background: "var(--line)" }} />
        <span className="text-[12px] text-[var(--ink-3)]">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Jobs table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
        <table className="w-full text-[13.5px]">
          <thead style={{ background: "var(--panel)" }}>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
              <th className="p-3 font-medium">Job</th>
              <th className="p-3 font-medium">Target</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Last Run</th>
              <th className="p-3 font-medium">Next Run</th>
              <th className="p-3 font-medium">Duration</th>
              <th className="p-3 font-medium">Errors</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} now={now} />
            ))}
          </tbody>
        </table>
      </div>


    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CronsPage() {
  const jobs = readCronJobs();
  const now = Date.now();

  // Summary totals across all agents
  const total = jobs.length;
  const enabled = jobs.filter((j) => j.enabled).length;
  const withErrors = jobs.filter((j) => (j.consecutiveErrors ?? 0) > 0).length;
  const disabled = jobs.filter((j) => !j.enabled).length;

  // Group by agentId (fallback to "unknown" if missing)
  const groupMap = new Map<string, CronJob[]>();
  for (const job of jobs) {
    const key = job.agentId ?? "unknown";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(job);
  }

  // Sort: "main" first, then alphabetical
  const sortedAgentIds = Array.from(groupMap.keys()).sort((a, b) => {
    if (a === "main") return -1;
    if (b === "main") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-2">Cron Jobs</h1>
      <p className="text-[var(--ink-2)] mb-8">
        All scheduled OpenClaw jobs and their health.
      </p>

      {/* Summary bar — totals across all agents */}
      <div
        className="flex gap-6 mb-10 p-4 rounded-xl"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">Total</span>
          <span className="text-[22px] font-semibold">{total}</span>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--line)" }} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">Enabled</span>
          <span className="text-[22px] font-semibold" style={{ color: "var(--accent)" }}>{enabled}</span>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--line)" }} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">With Errors</span>
          <span
            className="text-[22px] font-semibold"
            style={{ color: withErrors > 0 ? "#e55" : "var(--ink-3)" }}
          >
            {withErrors}
          </span>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--line)" }} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">Disabled</span>
          <span className="text-[22px] font-semibold" style={{ color: "var(--ink-3)" }}>{disabled}</span>
        </div>
        <div className="w-px self-stretch" style={{ background: "var(--line)" }} />
        <div className="flex flex-col">
          <span className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1">Agents</span>
          <span className="text-[22px] font-semibold">{sortedAgentIds.length}</span>
        </div>
      </div>

      {/* Consolidated Errors Block */}
      {(() => {
        const allErrorJobs = jobs.filter((j) => j.lastError || j.lastDiagnosticSummary);
        if (allErrorJobs.length === 0) return null;
        return (
          <div
            className="mb-10 rounded-xl overflow-hidden"
            style={{
              border: "1px solid rgba(220,50,50,0.4)",
              background: "rgba(220,50,50,0.04)",
            }}
          >
            {/* Error banner header */}
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: "rgba(220,50,50,0.12)",
                borderBottom: "1px solid rgba(220,50,50,0.3)",
                borderLeft: "4px solid rgba(220,50,50,0.8)",
              }}
            >
              <span className="text-[16px]">⚠️</span>
              <span
                className="text-[14px] font-semibold tracking-[-0.01em]"
                style={{ color: "#e55" }}
              >
                {allErrorJobs.length} job{allErrorJobs.length !== 1 ? "s" : ""} need attention
              </span>
            </div>
            {/* Error entries */}
            <div className="flex flex-col divide-y" style={{ borderColor: "rgba(220,50,50,0.15)" }}>
              {allErrorJobs.map((job) => {
                const { name: agentName, emoji: agentEmoji } = agentDisplayInfo(job.agentId ?? "unknown");
                const msg = job.lastDiagnosticSummary || job.lastError || "";
                return (
                  <div
                    key={job.id}
                    className="px-4 py-3"
                    style={{ borderColor: "rgba(220,50,50,0.15)" }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[13px]">{agentEmoji}</span>
                      <span
                        className="text-[12px] font-medium"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {agentName}
                      </span>
                      <span style={{ color: "rgba(220,50,50,0.5)" }}>·</span>
                      <span className="text-[13px] font-semibold text-[var(--ink)]">
                        {job.name}
                      </span>
                      {!job.enabled && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] ml-1"
                          style={{ background: "#3a3a3a", color: "var(--ink-3)" }}
                        >
                          disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[12.5px] leading-relaxed break-words" style={{ color: "var(--ink-2)" }}>
                      {msg}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      {/* Agent sections */}
      {sortedAgentIds.length === 0 ? (
        <div
          className="rounded-xl p-8 text-center text-[var(--ink-3)]"
          style={{ border: "1px solid var(--line)" }}
        >
          No cron jobs found.
        </div>
      ) : (
        sortedAgentIds.map((agentId) => (
          <AgentSection
            key={agentId}
            agentId={agentId}
            jobs={groupMap.get(agentId)!}
            now={now}
          />
        ))
      )}
    </div>
  );
}
