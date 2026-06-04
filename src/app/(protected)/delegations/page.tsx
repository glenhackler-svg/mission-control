"use client";

import { useEffect, useState } from "react";

export const dynamic = "force-dynamic";

interface Delegation {
  id: string;
  title: string;
  parentAgentId: string;
  childAgentId: string;
  parentSessionCost: number;
  childSessionCost: number;
  totalCost: number;
  status: string;
  notes: string | null;
  delegatedAt: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  in_progress: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  completed: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  failed: "bg-red-500/15 text-red-400 border-red-500/30",
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

function agentLabel(id: string) {
  const emoji = AGENT_EMOJIS[id] || "🤖";
  return `${emoji} ${id}`;
}

function Badge({ label, colorClass }: { label: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${colorClass}`}
    >
      {label.replace("_", " ")}
    </span>
  );
}

export default function DelegationsPage() {
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/delegations")
      .then((r) => r.json())
      .then((data) => {
        setDelegations(data.delegations || []);
        setTotal(data.total || 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const grandTotal = delegations.reduce((sum, d) => sum + d.totalCost, 0);

  return (
    <div className="p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Delegations</h1>
        {!loading && (
          <div className="text-right">
            <div className="text-[12px] text-[var(--ink-3)]">Grand total</div>
            <div className="text-[20px] font-semibold text-[var(--accent)]">
              ${grandTotal.toFixed(4)}
            </div>
          </div>
        )}
      </div>
      <p className="text-[var(--ink-2)] mb-8">
        Task cost rollup: parent planning tokens + child execution tokens per delegated task.
      </p>

      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
        <table className="w-full text-[13.5px]">
          <thead style={{ background: "var(--panel)" }}>
            <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
              <th className="p-3 font-medium">Task</th>
              <th className="p-3 font-medium">Delegation</th>
              <th className="p-3 font-medium">Delegated at</th>
              <th className="p-3 font-medium text-right">Parent cost</th>
              <th className="p-3 font-medium text-right">Child cost</th>
              <th className="p-3 font-medium text-right font-semibold">Total</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[var(--ink-3)]">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && delegations.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-[var(--ink-3)]">
                  No delegations yet. When Claw delegates a task and reports costs, they appear here.
                </td>
              </tr>
            )}
            {delegations.map((d) => (
              <>
                <tr
                  key={d.id}
                  className="border-t cursor-pointer hover:bg-[var(--panel)] transition-colors"
                  style={{ borderColor: "var(--line)" }}
                  onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                >
                  <td className="p-3 font-medium max-w-[260px] truncate">{d.title}</td>
                  <td className="p-3 text-[var(--ink-2)] whitespace-nowrap">
                    {agentLabel(d.parentAgentId)}{" "}
                    <span className="text-[var(--ink-3)]">→</span>{" "}
                    {agentLabel(d.childAgentId)}
                  </td>
                  <td className="p-3 text-[var(--ink-3)] whitespace-nowrap">
                    {new Date(d.delegatedAt).toLocaleString()}
                  </td>
                  <td className="p-3 text-right text-[var(--ink-2)]">
                    ${d.parentSessionCost.toFixed(4)}
                  </td>
                  <td className="p-3 text-right text-[var(--ink-2)]">
                    ${d.childSessionCost.toFixed(4)}
                  </td>
                  <td className="p-3 text-right font-semibold">
                    ${d.totalCost.toFixed(4)}
                  </td>
                  <td className="p-3">
                    <Badge
                      label={d.status}
                      colorClass={STATUS_COLORS[d.status] || STATUS_COLORS.in_progress}
                    />
                  </td>
                </tr>
                {expandedId === d.id && (
                  <tr
                    key={`${d.id}-notes`}
                    className="border-t"
                    style={{ borderColor: "var(--line)", background: "var(--panel)" }}
                  >
                    <td colSpan={7} className="px-4 py-3">
                      <div className="text-[12px] text-[var(--ink-3)] mb-1">ID: {d.id}</div>
                      {d.notes ? (
                        <div className="text-[13px] text-[var(--ink-2)] whitespace-pre-wrap">{d.notes}</div>
                      ) : (
                        <div className="text-[13px] text-[var(--ink-3)] italic">No notes.</div>
                      )}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="mt-3 text-[12px] text-[var(--ink-3)] text-right">
          {total} delegation{total !== 1 ? "s" : ""} total
        </div>
      )}
    </div>
  );
}
