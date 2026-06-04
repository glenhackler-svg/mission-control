"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

type Lead = {
  id: number;
  batchId: string;
  company: string;
  contactName: string | null;
  email: string;
  website: string | null;
  opportunityScore: number;
  city: string | null;
  address: string | null;
  phone: string | null;
  subject: string;
  sentAt: Date | string;
  opened: boolean;
  openedAt: Date | string | null;
  openTrackingId: string;
  unsubscribed: boolean;
  unsubscribedAt: Date | string | null;
  booked: boolean;
  bookedAt: Date | string | null;
  bounced: boolean;
  bouncedAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
};

function extractDomain(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function CompanyDetailModal({ lead, onClose }: { lead: Lead; onClose: () => void }) {
  const domain = extractDomain(lead.website);
  const websiteHref = lead.website
    ? lead.website.startsWith("http")
      ? lead.website
      : `https://${lead.website}`
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-full text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-white/10 transition-colors text-[16px] leading-none"
          aria-label="Close"
        >
          ✕
        </button>

        {/* Company name */}
        <h2 className="text-[22px] font-bold tracking-[-0.02em] text-[var(--ink)] mb-1 pr-8">
          {lead.company}
        </h2>
        {lead.city && (
          <div className="text-[13px] text-[var(--ink-3)] mb-5">{lead.city}</div>
        )}

        {/* Detail rows */}
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="text-[18px] mt-0.5">📍</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">Address</div>
              <div className="text-[13.5px] text-[var(--ink)]">
                {lead.address || <span className="text-[var(--ink-3)] italic">Address not on file</span>}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[18px] mt-0.5">📞</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">Phone</div>
              <div className="text-[13.5px] text-[var(--ink)]">
                {lead.phone ? (
                  <a href={`tel:${lead.phone}`} className="hover:underline">{lead.phone}</a>
                ) : (
                  <span className="text-[var(--ink-3)] italic">Not on file</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[18px] mt-0.5">🔗</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">Website</div>
              <div className="text-[13.5px]">
                {websiteHref && domain ? (
                  <a
                    href={websiteHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[var(--accent)] hover:underline"
                  >
                    {domain}
                  </a>
                ) : (
                  <span className="text-[var(--ink-3)] italic">Not on file</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="text-[18px] mt-0.5">✉️</span>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">Email</div>
              <div className="text-[13.5px]">
                <a href={`mailto:${lead.email}`} className="text-[var(--accent)] hover:underline">
                  {lead.email}
                </a>
              </div>
            </div>
          </div>

          <div className="h-px" style={{ background: "var(--line)" }} />

          <div className="flex items-center gap-6">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">City</div>
              <div className="text-[13.5px] text-[var(--ink)]">{lead.city || "—"}</div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-0.5">Opportunity Score</div>
              <ScoreBadge score={lead.opportunityScore} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color =
    score >= 8
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : score >= 5
      ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-red-500/20 text-red-400 border-red-500/30";
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-6 rounded text-[11px] font-bold border ${color}`}
    >
      {score}
    </span>
  );
}

function relativeTime(date: Date | string | null): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function MarketingClient({
  leads: initialLeads,
  batchIds,
  activeBatchId,
}: {
  leads: Lead[];
  batchIds: string[];
  activeBatchId: string | null;
}) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [editingNotes, setEditingNotes] = useState<number | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [checkingBounces, setCheckingBounces] = useState(false);
  const [bounceResult, setBounceResult] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Summary stats
  const total = leads.length;
  const opened = leads.filter((l) => l.opened).length;
  const openRate = total > 0 ? Math.round((opened / total) * 100) : 0;
  const unsubscribed = leads.filter((l) => l.unsubscribed).length;
  const booked = leads.filter((l) => l.booked).length;
  const bounced = leads.filter((l) => l.bounced).length;

  async function checkBounces() {
    setCheckingBounces(true);
    setBounceResult(null);
    try {
      const res = await fetch("/api/leads/check-bounces", {
        method: "POST",
        // Auth handled via session cookie (admin is logged in via mc_session)
      });
      const data = await res.json();
      if (res.ok) {
        setBounceResult(
          data.newBounces > 0
            ? `✅ Found ${data.newBounces} new bounce(s): ${data.leads.map((l: { email: string }) => l.email).join(", ")}`
            : `✓ Checked ${data.checked} DSN message(s) — no new bounces`
        );
        if (data.newBounces > 0) {
          startTransition(() => router.refresh());
        }
      } else {
        setBounceResult(`Error: ${data.error ?? "Unknown error"}`);
      }
    } catch (e) {
      setBounceResult(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setCheckingBounces(false);
    }
  }

  function handleBatchChange(batchId: string) {
    if (batchId === "__all__") {
      router.push("/marketing");
    } else {
      router.push(`/marketing?batchId=${encodeURIComponent(batchId)}`);
    }
  }

  async function saveNotes(leadId: number, notes: string) {
    const res = await fetch(`/api/leads/${leadId}/notes`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    if (res.ok) {
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, notes } : l))
      );
    }
    setEditingNotes(null);
  }

  async function toggleBooked(lead: Lead) {
    if (!lead.booked) {
      await fetch(`/api/leads/${lead.id}/booked`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
    } else {
      // Undo booked via notes endpoint style — re-use PATCH on the booked endpoint won't work,
      // so we update via a special unbooked action through /api/leads/[id]
      // For undo, use the dashboard session automatically via cookie
      await fetch(`/api/leads/${lead.id}/booked`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });
    }
    startTransition(() => router.refresh());
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      {/* Company detail modal */}
      {selectedLead && (
        <CompanyDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[32px] font-semibold tracking-[-0.02em] mb-1">
            Lead Gen Campaigns
          </h1>
          <p className="text-[var(--ink-2)] text-sm">
            Outbound emails tracked by Scout · {total} total leads
          </p>
        </div>

        {/* Batch filter + Check Bounces */}
        <div className="flex items-center gap-3">
          <button
            onClick={checkBounces}
            disabled={checkingBounces}
            className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {checkingBounces ? "Checking…" : "⚠ Check Bounces"}
          </button>
          <div className="flex items-center gap-2">
            <label className="text-[13px] text-[var(--ink-2)]">Batch:</label>
            <select
              value={activeBatchId || "__all__"}
              onChange={(e) => handleBatchChange(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[13px] bg-[var(--panel)] border border-[var(--line)] text-[var(--ink)] focus:outline-none focus:border-[var(--accent)]"
            >
              <option value="__all__">All batches</option>
              {batchIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Bounce result notification */}
      {bounceResult && (
        <div
          className="mb-4 px-4 py-2.5 rounded-lg text-[13px]"
          style={{
            background: bounceResult.startsWith("Error")
              ? "rgba(239,68,68,0.1)"
              : "rgba(34,197,94,0.1)",
            border: `1px solid ${bounceResult.startsWith("Error") ? "rgba(239,68,68,0.3)" : "rgba(34,197,94,0.3)"}`,
            color: bounceResult.startsWith("Error") ? "#f87171" : "#4ade80",
          }}
        >
          {bounceResult}
        </div>
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: "Total Sent", value: total, sub: null },
          {
            label: "Opened",
            value: `${opened}`,
            sub: `${openRate}% open rate`,
            accent: opened > 0,
          },
          {
            label: "Unsubscribed",
            value: unsubscribed,
            sub: null,
            warn: unsubscribed > 0,
          },
          {
            label: "Booked",
            value: booked,
            sub: null,
            success: booked > 0,
          },
          {
            label: "Bounced",
            value: bounced,
            sub: null,
            warn: bounced > 0,
          },
        ].map(({ label, value, sub, accent, warn, success }) => (
          <div
            key={label}
            className="rounded-xl p-4"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div className="text-[11px] uppercase tracking-wider text-[var(--ink-3)] mb-1.5">
              {label}
            </div>
            <div
              className={`text-[28px] font-semibold tracking-[-0.02em] ${
                success
                  ? "text-emerald-400"
                  : warn
                  ? "text-red-400"
                  : accent
                  ? "text-[var(--accent)]"
                  : "text-[var(--ink)]"
              }`}
            >
              {value}
            </div>
            {sub && (
              <div className="text-[12px] text-[var(--ink-3)] mt-0.5">{sub}</div>
            )}
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: "1px solid var(--line)" }}
      >
        {leads.length === 0 ? (
          <div className="p-12 text-center text-[var(--ink-3)]">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-[15px] font-medium mb-1">No leads yet</div>
            <div className="text-[13px]">
              Scout will POST here after each outbound email send.
            </div>
          </div>
        ) : (
          <table className="w-full text-[13.5px]">
            <thead style={{ background: "var(--panel)" }}>
              <tr className="text-left text-[11px] uppercase tracking-wider text-[var(--ink-3)]">
                <th className="p-3 font-medium">Company</th>
                <th className="p-3 font-medium">City</th>
                <th className="p-3 font-medium">Email</th>
                <th className="p-3 font-medium text-center">Score</th>
                <th className="p-3 font-medium">Sent</th>
                <th className="p-3 font-medium text-center">Opened</th>
                <th className="p-3 font-medium text-center">Bounced</th>
                <th className="p-3 font-medium text-center">Unsub</th>
                <th className="p-3 font-medium text-center">Booked</th>
                <th className="p-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-t hover:bg-white/[0.02] transition-colors"
                  style={{ borderColor: "var(--line)" }}
                >
                  {/* Company */}
                  <td className="p-3">
                    <button
                      onClick={() => setSelectedLead(lead)}
                      className="font-medium text-[var(--ink)] hover:underline cursor-pointer text-left"
                    >
                      {lead.company}
                    </button>
                    {lead.website && (
                      <div className="text-[11px] text-[var(--ink-3)] truncate max-w-[160px]">
                        {lead.website}
                      </div>
                    )}
                  </td>

                  {/* City */}
                  <td className="p-3 text-[var(--ink-2)]">{lead.city || "—"}</td>

                  {/* Email */}
                  <td className="p-3">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-[var(--accent)] hover:underline truncate max-w-[180px] block"
                    >
                      {lead.email}
                    </a>
                  </td>

                  {/* Score */}
                  <td className="p-3 text-center">
                    <ScoreBadge score={lead.opportunityScore} />
                  </td>

                  {/* Sent */}
                  <td className="p-3 text-[var(--ink-3)] whitespace-nowrap">
                    {relativeTime(lead.sentAt)}
                  </td>

                  {/* Opened */}
                  <td className="p-3 text-center">
                    {lead.opened ? (
                      <span title={lead.openedAt ? new Date(lead.openedAt).toLocaleString() : ""}>
                        ✅
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>

                  {/* Bounced */}
                  <td className="p-3 text-center">
                    {lead.bounced ? (
                      <span
                        title={lead.bouncedAt ? `Bounced ${new Date(lead.bouncedAt).toLocaleString()}` : "Hard bounce"}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-red-500/20 text-red-400 border border-red-500/30"
                      >
                        ⚠ Bounced
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>

                  {/* Unsubscribed */}
                  <td className="p-3 text-center">
                    {lead.unsubscribed ? (
                      <span title={lead.unsubscribedAt ? new Date(lead.unsubscribedAt).toLocaleString() : ""}>
                        🚫
                      </span>
                    ) : (
                      <span className="text-[var(--ink-3)]">—</span>
                    )}
                  </td>

                  {/* Booked */}
                  <td className="p-3 text-center">
                    <button
                      onClick={() => toggleBooked(lead)}
                      title={lead.booked ? "Mark as not booked" : "Mark as booked"}
                      className="hover:opacity-80 transition-opacity"
                    >
                      {lead.booked ? (
                        <span title={lead.bookedAt ? new Date(lead.bookedAt).toLocaleString() : ""}>
                          📅
                        </span>
                      ) : (
                        <span className="text-[var(--ink-3)] text-[11px]">—</span>
                      )}
                    </button>
                  </td>

                  {/* Notes */}
                  <td className="p-3 min-w-[140px]">
                    {editingNotes === lead.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          autoFocus
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveNotes(lead.id, notesDraft);
                            if (e.key === "Escape") setEditingNotes(null);
                          }}
                          className="flex-1 px-2 py-0.5 rounded text-[12px] bg-[var(--bg)] border border-[var(--accent)] text-[var(--ink)] focus:outline-none"
                          placeholder="Add note…"
                        />
                        <button
                          onClick={() => saveNotes(lead.id, notesDraft)}
                          className="text-[var(--accent)] hover:opacity-80 text-[11px] font-medium"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="text-[var(--ink-3)] hover:opacity-80 text-[11px]"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingNotes(lead.id);
                          setNotesDraft(lead.notes || "");
                        }}
                        className="text-left text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors w-full truncate max-w-[200px] text-[12px]"
                      >
                        {lead.notes || (
                          <span className="text-[var(--ink-3)] italic">Add note…</span>
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
