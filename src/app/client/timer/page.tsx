"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface TimerSummary {
  totalSeconds: number;
  weekSeconds: number;
  monthSeconds: number;
  byTask: Array<{
    taskId: number;
    taskTitle: string;
    projectName: string;
    totalSeconds: number;
  }>;
}

function fmtHours(seconds: number): string {
  if (seconds <= 0) return "0h 0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

function fmtHoursShort(seconds: number): string {
  if (seconds <= 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
  return `${m}m`;
}

export default function ClientTimerPage() {
  const [summary, setSummary] = useState<TimerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/client/timer")
      .then((r) => r.json())
      .then((d) => {
        setSummary(d.summary ?? null);
        setLoading(false);
      });
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Time Summary</h1>
        <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
          Glen&apos;s total time logged — read only
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--ink-3)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading…</span>
        </div>
      ) : !summary ? (
        <p style={{ color: "var(--ink-3)" }}>No data available.</p>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "This Week", value: summary.weekSeconds },
              { label: "This Month", value: summary.monthSeconds },
              { label: "All Time", value: summary.totalSeconds },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="rounded-xl p-5 flex flex-col gap-2"
                style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
              >
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                  {label}
                </span>
                <span className="text-2xl font-bold tracking-tight">{fmtHours(value)}</span>
              </div>
            ))}
          </div>

          {/* Per-task breakdown */}
          {summary.byTask.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--ink-3)" }}>
                By Task
              </h2>
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--line)" }}
              >
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--panel)", borderBottom: "1px solid var(--line)" }}>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Task</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Project</th>
                      <th className="text-right px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byTask.map((row, i) => (
                      <tr
                        key={row.taskId}
                        style={{
                          background: i % 2 === 0 ? "var(--bg)" : "var(--panel)",
                          borderTop: i > 0 ? "1px solid var(--line)" : undefined,
                        }}
                      >
                        <td className="px-4 py-2.5" style={{ color: "var(--ink)" }}>{row.taskTitle}</td>
                        <td className="px-4 py-2.5 text-[12px]" style={{ color: "var(--ink-3)" }}>{row.projectName}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-[12px]" style={{ color: "var(--ink-2)" }}>
                          {fmtHoursShort(row.totalSeconds)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
