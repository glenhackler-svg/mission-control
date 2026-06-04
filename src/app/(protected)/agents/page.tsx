import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                     "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default async function AgentsPage() {
  let agents: Array<{
    id: string;
    name: string;
    emoji: string | null;
    role: string | null;
    status: string;
    lastActive: Date | null;
    tasksCompleted: number;
    totalCost: number;
    currentTask: string | null;
  }> = [];

  let mtdAgentCost = 0;
  let mtdDelegationCost = 0;
  let monthlyHistory: Array<{
    month: number;
    agentCost: number;
    delegationCost: number;
    totalCost: number;
  }> = [];
  let ytdTotal = 0;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  try {
    agents = await prisma.agentState.findMany({ orderBy: { name: "asc" } });

    // Live cumulative agent total (running odometer — already covers all months)
    mtdAgentCost = agents.reduce((sum, a) => sum + a.totalCost, 0);

    // Current month delegations only
    const monthStart = new Date(currentYear, now.getMonth(), 1);
    const delegAgg = await prisma.taskDelegation.aggregate({
      _sum: { totalCost: true },
      where: { createdAt: { gte: monthStart } },
    });
    mtdDelegationCost = delegAgg._sum.totalCost ?? 0;

    // Historical monthly snapshots for this year (stored as cumulative agent cost + monthly delegations)
    const rows = await prisma.monthlyAgentCost.findMany({
      where: { year: currentYear },
      orderBy: { month: "asc" },
    });
    monthlyHistory = rows;

    // --- YTD: sum incremental totals per month (no double-counting) ---
    //
    // Each saved row stores the CUMULATIVE agent total at snapshot time.
    // To get this month's agent SPEND we compute: thisMonth.agentCost - prevMonth.agentCost (floored at 0).
    // For the current live month we use: max(0, currentAgentTotal - lastSnapshot.agentCost).
    // Delegation costs are already per-period, so they add directly.

    let ytdRunning = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prev = i > 0 ? rows[i - 1] : null;
      const agentIncremental = prev
        ? Math.max(0, row.agentCost - prev.agentCost)
        : row.agentCost; // first month ever — full cumulative = that month's spend
      ytdRunning += agentIncremental + row.delegationCost;
    }

    // Add current live month's incremental
    const lastSaved = rows.length > 0 ? rows[rows.length - 1] : null;
    const liveAgentIncremental = lastSaved
      ? Math.max(0, mtdAgentCost - lastSaved.agentCost)
      : mtdAgentCost;
    ytdRunning += liveAgentIncremental + mtdDelegationCost;

    ytdTotal = ytdRunning;
  } catch {}

  // Build all months Jan–Dec, tagging each with display values
  const lastSaved = monthlyHistory.length > 0 ? monthlyHistory[monthlyHistory.length - 1] : null;
  const liveAgentIncremental = lastSaved
    ? Math.max(0, mtdAgentCost - lastSaved.agentCost)
    : mtdAgentCost;
  const liveMonthTotal = liveAgentIncremental + mtdDelegationCost;

  const allMonths = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    const saved = monthlyHistory.find((r) => r.month === m);
    const prevSaved = monthlyHistory.find((r) => r.month === m - 1);
    const isCurrent = m === currentMonth;
    const isFuture = m > currentMonth;

    let agentDisplay: number | null = null;
    let delegDisplay: number | null = null;
    let totalDisplay: number | null = null;

    if (isCurrent) {
      agentDisplay = liveAgentIncremental;
      delegDisplay = mtdDelegationCost;
      totalDisplay = liveMonthTotal;
    } else if (saved) {
      // Incremental agent spend for this past month
      agentDisplay = prevSaved
        ? Math.max(0, saved.agentCost - prevSaved.agentCost)
        : saved.agentCost;
      delegDisplay = saved.delegationCost;
      totalDisplay = agentDisplay + delegDisplay;
    }
    // isFuture with no saved data → all null (shows —)

    return { month: m, agentDisplay, delegDisplay, totalDisplay, isCurrent, isFuture, hasSaved: !!saved };
  });

  return (
    <div className="p-8 max-w-[1200px] mx-auto">
      {/* Page header row */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-2">Agents</h1>
          <p className="text-[var(--ink-2)]">
            Every agent your OpenClaw stack is running. They self-report here via{" "}
            <code className="px-1.5 py-0.5 rounded" style={{ background: "var(--panel)" }}>
              POST /api/agents/state
            </code>
            .
          </p>
        </div>

        {/* MTD cost totals — top right */}
        <div
          className="flex flex-col gap-1 text-right shrink-0 ml-8 rounded-xl px-5 py-4"
          style={{ border: "1px solid var(--line)", background: "var(--panel)", minWidth: "200px" }}
        >
          <p className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] font-medium mb-1">
            Month to Date
          </p>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[12px] text-[var(--ink-2)]">Agents</span>
            <span className="text-[15px] font-semibold tabular-nums">
              ${liveAgentIncremental.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-6">
            <span className="text-[12px] text-[var(--ink-2)]">Delegations</span>
            <span className="text-[15px] font-semibold tabular-nums">
              ${mtdDelegationCost.toFixed(2)}
            </span>
          </div>
          <div
            className="mt-2 pt-2 flex items-center justify-between gap-6"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <span className="text-[12px] text-[var(--ink-2)]">Total</span>
            <span className="text-[15px] font-bold tabular-nums">
              ${liveMonthTotal.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Agents table */}
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
        <table className="w-full text-[13.5px]">
          <thead style={{ background: "var(--panel)" }}>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
              <th className="p-3 font-medium">Agent</th>
              <th className="p-3 font-medium">Role</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Current task</th>
              <th className="p-3 font-medium text-right">Tasks</th>
              <th className="p-3 font-medium text-right">Cost</th>
              <th className="p-3 font-medium">Last active</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} className="border-t" style={{ borderColor: "var(--line)" }}>
                <td className="p-3 font-medium">
                  <span className="mr-2">{a.emoji || "🤖"}</span>
                  {a.name}
                </td>
                <td className="p-3 text-[var(--ink-2)]">{a.role || "-"}</td>
                <td className="p-3">{a.status}</td>
                <td className="p-3 text-[var(--ink-2)] truncate max-w-[280px]">
                  {a.currentTask || "-"}
                </td>
                <td className="p-3 text-right">{a.tasksCompleted}</td>
                <td className="p-3 text-right">${a.totalCost.toFixed(2)}</td>
                <td className="p-3 text-[var(--ink-3)]">
                  {a.lastActive ? new Date(a.lastActive).toLocaleString() : "never"}
                </td>
              </tr>
            ))}
            {agents.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[var(--ink-3)]">
                  No agents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Annual cost tally */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-semibold tracking-[-0.01em]">
            {currentYear} Cost History
          </h2>
          <div
            className="flex items-center gap-3 rounded-lg px-4 py-2"
            style={{ border: "1px solid var(--line)", background: "var(--panel)" }}
          >
            <span className="text-[12px] text-[var(--ink-2)] uppercase tracking-wider font-medium">
              Year to Date
            </span>
            <span className="text-[18px] font-bold tabular-nums">
              ${ytdTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          <table className="w-full text-[13px]">
            <thead style={{ background: "var(--panel)" }}>
              <tr className="text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
                <th className="p-3 font-medium text-left">Month</th>
                <th className="p-3 font-medium text-right">Agents</th>
                <th className="p-3 font-medium text-right">Delegations</th>
                <th className="p-3 font-medium text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {allMonths.map(({ month, agentDisplay, delegDisplay, totalDisplay, isCurrent, isFuture, hasSaved }) => (
                <tr
                  key={month}
                  className="border-t"
                  style={{
                    borderColor: "var(--line)",
                    opacity: isFuture && !hasSaved ? 0.35 : 1,
                    background: isCurrent
                      ? "color-mix(in srgb, var(--accent) 6%, transparent)"
                      : undefined,
                  }}
                >
                  <td className="p-3 font-medium">
                    <span className="flex items-center gap-2">
                      {MONTH_NAMES[month - 1]}
                      {isCurrent && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                          style={{ background: "var(--accent)", color: "var(--accent-fg, #fff)" }}
                        >
                          live
                        </span>
                      )}
                    </span>
                  </td>
                  <td className="p-3 text-right tabular-nums text-[var(--ink-2)]">
                    {agentDisplay !== null ? `$${agentDisplay.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums text-[var(--ink-2)]">
                    {delegDisplay !== null ? `$${delegDisplay.toFixed(2)}` : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums font-semibold">
                    {totalDisplay !== null ? `$${totalDisplay.toFixed(2)}` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
