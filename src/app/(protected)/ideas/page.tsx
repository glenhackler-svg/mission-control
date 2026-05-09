"use client";

import { useEffect, useState } from "react";

interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  source: string | null;
  status: string | null;
  timestamp: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  business:    "#6366f1",
  tech:        "#0ea5e9",
  personal:    "#10b981",
  consulting:  "#f59e0b",
  aa:          "#8b5cf6",
  content:     "#ec4899",
  product:     "#14b8a6",
};

function categoryColor(cat: string | null): string {
  if (!cat) return "#6b7280";
  return CATEGORY_COLORS[cat.toLowerCase()] ?? "#6b7280";
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, string> = {
  pending:  "pending",
  approved: "approved",
  rejected: "rejected",
};

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => { setIdeas(d.ideas); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000); // refresh every 30s
    return () => clearInterval(t);
  }, []);

  const categories = ideas
    ? Array.from(new Set(ideas.map((i) => i.category).filter(Boolean))) as string[]
    : [];

  const filtered = ideas
    ? filter === "all" ? ideas : ideas.filter((i) => i.category === filter)
    : [];

  return (
    <div className="p-8 max-w-[860px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Ideas</h1>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink-2)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      <p className="text-[var(--ink-2)] mb-6 text-sm">
        Einstein drops ideas here as you share them. {ideas ? `${ideas.length} total.` : ""}
      </p>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilter("all")}
            className="text-xs px-3 py-1 rounded-full"
            style={{
              background: filter === "all" ? "var(--accent, #6366f1)" : "var(--panel)",
              color: filter === "all" ? "#fff" : "var(--ink-2)",
              border: filter === "all" ? "none" : "1px solid var(--line)",
              cursor: "pointer",
            }}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className="text-xs px-3 py-1 rounded-full capitalize"
              style={{
                background: filter === cat ? categoryColor(cat) : "var(--panel)",
                color: filter === cat ? "#fff" : "var(--ink-2)",
                border: filter === cat ? "none" : "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl mb-4 text-sm" style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}>
          Could not load ideas: {error}
        </div>
      )}

      {/* Ideas list */}
      <div className="flex flex-col gap-2">
        {filtered.map((idea) => (
          <div
            key={idea.id}
            className="p-4 rounded-xl"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="font-medium text-[14px]" style={{ color: "var(--ink-1)" }}>
                {idea.title}
              </span>
              <span className="text-[11px] shrink-0 mt-0.5" style={{ color: "var(--ink-3)" }}>
                {timeAgo(idea.timestamp)}
              </span>
            </div>

            {idea.description && (
              <p className="text-[13px] mt-1" style={{ color: "var(--ink-2)" }}>
                {idea.description}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {idea.category && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                  style={{ background: categoryColor(idea.category) + "22", color: categoryColor(idea.category) }}
                >
                  {idea.category}
                </span>
              )}
              <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                {idea.source || "einstein"} · {STATUS_LABEL[idea.status ?? ""] ?? idea.status ?? "pending"}
              </span>
            </div>
          </div>
        ))}

        {!loading && filtered.length === 0 && (
          <div
            className="p-8 rounded-xl text-center"
            style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
          >
            {filter === "all"
              ? "No ideas yet. Tell Einstein an idea to get started."
              : `No ideas in "${filter}" yet.`}
          </div>
        )}
      </div>
    </div>
  );
}
