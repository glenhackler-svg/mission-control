"use client";

import { useRouter } from "next/navigation";

const STATUSES = ["all", "active", "pending", "completed", "failed", "cancelled"];

export function MissionStatusFilter({ current }: { current: string }) {
  const router = useRouter();

  function select(status: string) {
    if (status === "all") {
      router.push("/missions");
    } else {
      router.push(`/missions?status=${status}`);
    }
  }

  return (
    <div className="flex gap-1 flex-wrap">
      {STATUSES.map((s) => (
        <button
          key={s}
          onClick={() => select(s)}
          className={`px-3 py-1.5 rounded-lg text-[12.5px] font-medium capitalize transition-colors ${
            current === s
              ? "text-[var(--ink)]"
              : "text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--panel)]"
          }`}
          style={
            current === s
              ? { background: "var(--panel)", border: "1px solid var(--line)" }
              : { border: "1px solid transparent" }
          }
        >
          {s}
        </button>
      ))}
    </div>
  );
}
