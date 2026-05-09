import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function MissionsPage() {
  let missions: Array<{ id: string; agentId: string; title: string; status: string; priority: string; createdAt: Date }> = [];
  try {
    missions = await prisma.mission.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
  } catch {}

  return (
    <div className="p-8 max-w-[1000px] mx-auto">
      <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-2">Missions</h1>
      <p className="text-[var(--ink-2)] mb-8">
        Work queued for your agents. They pick up pending missions, run them, and report status.
      </p>
      <div className="flex flex-col gap-2">
        {missions.map((m) => (
          <div
            key={m.id}
            className="p-4 rounded-xl flex items-center gap-4"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium text-[14px]">{m.title}</div>
              <div className="text-[12px] text-[var(--ink-3)]">
                {m.agentId} · {m.priority}
              </div>
            </div>
            <div className="text-[12px] text-[var(--ink-2)]">{m.status}</div>
          </div>
        ))}
        {missions.length === 0 && (
          <div className="p-6 text-center text-[var(--ink-3)]">No missions yet.</div>
        )}
      </div>
    </div>
  );
}
