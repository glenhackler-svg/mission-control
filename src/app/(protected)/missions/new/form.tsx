"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const AGENTS = [
  { value: "claw", label: "🐾 Claw (CEO)" },
  { value: "kodee", label: "💻 Kodee (Dev)" },
  { value: "scout", label: "🔍 Scout (Research)" },
  { value: "einstein", label: "🧠 Einstein (Analysis)" },
  { value: "bill-w", label: "📊 Bill-W (Finance)" },
  { value: "michelangelo", label: "🎨 Michelangelo (Creative)" },
  { value: "stephen-hawking", label: "🌌 Stephen Hawking (Science)" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

interface Step {
  title: string;
  description: string;
  agentId: string;
}

const DEFAULT_STEP: Step = { title: "", description: "", agentId: "claw" };

export function NewMissionForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [agentId, setAgentId] = useState("claw");
  const [steps, setSteps] = useState<Step[]>([{ ...DEFAULT_STEP }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addStep() {
    setSteps((prev) => [...prev, { ...DEFAULT_STEP }]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStep(idx: number, field: keyof Step, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const payload = {
        title,
        description,
        priority,
        agentId,
        steps: steps.map((s, idx) => ({
          ...s,
          stepNumber: idx + 1,
        })),
      };

      const res = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || `Request failed: ${res.status}`);
      }

      const data = await res.json();
      router.push(`/missions/${data.mission.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full px-3 py-2 rounded-lg text-[13.5px] outline-none focus:ring-1 ring-[var(--accent)] transition-shadow";
  const inputStyle = { background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" };
  const labelCls = "block text-[12px] font-medium text-[var(--ink-2)] mb-1.5 uppercase tracking-wide";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Title */}
      <div>
        <label className={labelCls}>Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputCls}
          style={inputStyle}
          placeholder="Build the authentication system"
          required
        />
      </div>

      {/* Description */}
      <div>
        <label className={labelCls}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={inputCls}
          style={inputStyle}
          rows={3}
          placeholder="High-level goal of this mission..."
          required
        />
      </div>

      {/* Priority + Owner row */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Priority</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Owner Agent</label>
          <select
            value={agentId}
            onChange={(e) => setAgentId(e.target.value)}
            className={inputCls}
            style={inputStyle}
          >
            {AGENTS.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className={labelCls + " mb-0"}>Steps</label>
          <button
            type="button"
            onClick={addStep}
            className="text-[12.5px] font-medium px-3 py-1 rounded-lg transition-colors"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            + Add Step
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl"
              style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[12px] font-semibold text-[var(--ink-3)] uppercase tracking-wide">
                  Step {idx + 1}
                </div>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(idx)}
                    className="text-[12px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Title</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => updateStep(idx, "title", e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                      placeholder="Research competitors"
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Assigned Agent</label>
                    <select
                      value={step.agentId}
                      onChange={(e) => updateStep(idx, "agentId", e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                    >
                      {AGENTS.map((a) => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Prompt / Instructions</label>
                  <textarea
                    value={step.description}
                    onChange={(e) => updateStep(idx, "description", e.target.value)}
                    className={inputCls}
                    style={inputStyle}
                    rows={3}
                    placeholder="Full instructions the agent will receive when this step activates..."
                    required
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div
          className="px-4 py-3 rounded-lg text-[13px] text-red-400"
          style={{ background: "var(--panel)", border: "1px solid rgba(239,68,68,0.3)" }}
        >
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-6 py-2.5 rounded-lg text-[13.5px] font-medium transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#000" }}
        >
          {submitting ? "Creating…" : "Create Mission"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/missions")}
          className="px-4 py-2.5 rounded-lg text-[13.5px] text-[var(--ink-2)] hover:text-[var(--ink)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
