import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { MissionStatusFilter } from "./status-filter";

export const dynamic = "force-dynamic";

const PRIORITY_COLORS: Record<string, string> = {
  urgent: "bg-red-500/15 text-red-400 border-red-500/30",
  high: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  medium: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  low: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/15 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

const AGENT_EMOJIS: Record<string, string> = {
  claw: "🐾",
  kodee: "💻",
  scout: "🔍",
  einstein: "🧠",
  "bill-w": "📊",
  michelangelo: "🎨",
  "stephen-hawking": "🌌",
};

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${colorClass}`}
    >
      {label}
    </span>
  );
}

function ProgressBar({ completed, total }: { completed: number; total: number }) {
  const pct = total > 0 ? (completed / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, background: "var(--accent)" }}
        />
      </div>
      <span className="text-[11px] text-[var(--ink-3)] whitespace-nowrap">
        {completed}/{total} steps
      </span>
    </div>
  );
}

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status: filterStatus } = await searchParams;

  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: { select: { status: true } },
    },
  });

  const filtered =
    filterStatus && filterStatus !== "all"
      ? missions.filter((m) => m.status === filterStatus)
      : missions;

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Missions</h1>
        <Link
          href="/missions/new"
          className="px-4 py-2 rounded-lg text-[13.5px] font-medium transition-colors"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          + New Mission
        </Link>
      </div>
      <p className="text-[var(--ink-2)] mb-6">
        Multi-step goals assigned across your agents. Each step fires sequentially.
      </p>

      <MissionStatusFilter current={filterStatus || "all"} />

      <div className="flex flex-col gap-3 mt-6">
        {filtered.map((m) => {
          const totalSteps = m.steps.length;
          const completedSteps = m.steps.filter((s) => s.status === "completed").length;
          const emoji = AGENT_EMOJIS[m.agentId] || "🤖";

          return (
            <Link
              key={m.id}
              href={`/missions/${m.id}`}
              className="block p-4 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge
                      label={m.priority}
                      colorClass={PRIORITY_COLORS[m.priority] || PRIORITY_COLORS.medium}
                    />
                    <Badge
                      label={m.status}
                      colorClass={STATUS_COLORS[m.status] || STATUS_COLORS.pending}
                    />
                  </div>
                  <div className="font-medium text-[14px] truncate">{m.title}</div>
                  <div className="text-[12px] text-[var(--ink-3)] mt-0.5 line-clamp-2">
                    {m.description}
                  </div>
                  {totalSteps > 0 && (
                    <ProgressBar completed={completedSteps} total={totalSteps} />
                  )}
                </div>
                <div className="text-right shrink-0 ml-2">
                  <div className="text-[13px]">
                    {emoji} {m.agentId}
                  </div>
                  <div className="text-[11px] text-[var(--ink-3)] mt-1">
                    {new Date(m.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}

        {filtered.length === 0 && (
          <div className="p-12 text-center text-[var(--ink-3)] rounded-xl" style={{ border: "1px dashed var(--line)" }}>
            {filterStatus && filterStatus !== "all"
              ? `No ${filterStatus} missions.`
              : "No missions yet. Create your first mission."}
          </div>
        )}
      </div>
    </div>
  );
}
