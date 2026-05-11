import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { CancelButton } from "./cancel-button";

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
  skipped: "bg-gray-500/15 text-gray-400 border-gray-500/30",
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

function DateRow({ label, value }: { label: string; value: Date | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-[12.5px]">
      <span className="text-[var(--ink-3)]">{label}:</span>
      <span className="text-[var(--ink-2)]">{new Date(value).toLocaleString()}</span>
    </div>
  );
}

function StepCircle({ status }: { status: string }) {
  if (status === "completed") {
    return (
      <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="w-8 h-8 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center shrink-0 animate-pulse">
        <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  if (status === "skipped") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ border: "1px dashed var(--line)" }}>
        <svg className="w-4 h-4 text-[var(--ink-3)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      </div>
    );
  }
  // pending
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ border: "1px solid var(--line)" }}
    />
  );
}

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const mission = await prisma.mission.findUnique({
    where: { id },
    include: { steps: { orderBy: { stepNumber: "asc" } } },
  });

  if (!mission) notFound();

  const totalSteps = mission.steps.length;
  const completedSteps = mission.steps.filter((s) => s.status === "completed").length;
  const isActive = ["pending", "active"].includes(mission.status);

  return (
    <>
      {/* Auto-refresh while active */}
      {isActive && <meta httpEquiv="refresh" content="30" />}

      <div className="p-8 max-w-[900px] mx-auto">
        {/* Breadcrumb */}
        <Link
          href="/missions"
          className="text-[12.5px] text-[var(--ink-3)] hover:text-[var(--ink)] transition-colors mb-4 inline-flex items-center gap-1"
        >
          ← Missions
        </Link>

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge
                  label={mission.priority}
                  colorClass={PRIORITY_COLORS[mission.priority] || PRIORITY_COLORS.medium}
                />
                <Badge
                  label={mission.status}
                  colorClass={STATUS_COLORS[mission.status] || STATUS_COLORS.pending}
                />
              </div>
              <h1 className="text-[28px] font-semibold tracking-[-0.02em] mb-1">
                {mission.title}
              </h1>
              <p className="text-[var(--ink-2)] text-[14px]">{mission.description}</p>
            </div>
            {isActive && (
              <div className="shrink-0">
                <CancelButton missionId={mission.id} />
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-4 flex flex-col gap-1.5">
            <div className="text-[12.5px]">
              <span className="text-[var(--ink-3)]">Owner:</span>{" "}
              <span className="text-[var(--ink-2)]">
                {AGENT_EMOJIS[mission.agentId] || "🤖"} {mission.agentId}
              </span>
            </div>
            <DateRow label="Created" value={mission.createdAt} />
            <DateRow label="Started" value={mission.startedAt} />
            <DateRow label="Completed" value={mission.completedAt} />
          </div>

          {/* Progress */}
          {totalSteps > 0 && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] text-[var(--ink-3)]">Progress</span>
                <span className="text-[12px] text-[var(--ink-2)]">
                  Step {completedSteps} of {totalSteps}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0}%`,
                    background: "var(--accent)",
                  }}
                />
              </div>
            </div>
          )}

          {/* Mission result */}
          {mission.result && mission.status === "completed" && (
            <div
              className="mt-4 p-3 rounded-lg text-[13px] text-[var(--ink-2)]"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              <div className="text-[11px] text-[var(--ink-3)] uppercase tracking-wide font-medium mb-1">
                Result
              </div>
              {mission.result}
            </div>
          )}
        </div>

        {/* Steps timeline */}
        {totalSteps > 0 && (
          <div>
            <h2 className="text-[16px] font-semibold mb-4">Steps</h2>
            <div className="flex flex-col">
              {mission.steps.map((step, idx) => (
                <div key={step.id} className="flex gap-4">
                  {/* Left: circle + line */}
                  <div className="flex flex-col items-center">
                    <StepCircle status={step.status} />
                    {idx < mission.steps.length - 1 && (
                      <div
                        className="w-px flex-1 my-1"
                        style={{ background: "var(--line)", minHeight: 20 }}
                      />
                    )}
                  </div>

                  {/* Right: content */}
                  <div className="flex-1 pb-6">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <span className="font-medium text-[14px]">{step.title}</span>
                        <span className="ml-2 text-[12px] text-[var(--ink-3)]">
                          {AGENT_EMOJIS[step.agentId] || "🤖"} {step.agentId}
                        </span>
                      </div>
                      <Badge
                        label={step.status}
                        colorClass={STATUS_COLORS[step.status] || STATUS_COLORS.pending}
                      />
                    </div>

                    <p className="text-[12.5px] text-[var(--ink-3)] mb-2 whitespace-pre-wrap">
                      {step.description}
                    </p>

                    {/* Timestamps */}
                    <div className="flex gap-3 text-[11px] text-[var(--ink-3)] mb-2">
                      {step.startedAt && (
                        <span>Started {new Date(step.startedAt).toLocaleString()}</span>
                      )}
                      {step.completedAt && (
                        <span>· Completed {new Date(step.completedAt).toLocaleString()}</span>
                      )}
                    </div>

                    {/* Result */}
                    {step.result && (
                      <details className="mt-1">
                        <summary className="text-[12px] font-medium text-teal-400 cursor-pointer select-none">
                          View result
                        </summary>
                        <div
                          className="mt-2 p-3 rounded-lg text-[12.5px] text-[var(--ink-2)] whitespace-pre-wrap"
                          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                        >
                          {step.result}
                        </div>
                      </details>
                    )}

                    {/* Error */}
                    {step.errorDetail && (
                      <div
                        className="mt-2 p-3 rounded-lg text-[12.5px] text-red-400 whitespace-pre-wrap"
                        style={{ background: "var(--panel)", border: "1px solid rgba(239,68,68,0.3)" }}
                      >
                        <div className="text-[11px] uppercase tracking-wide font-medium mb-1">Error</div>
                        {step.errorDetail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
