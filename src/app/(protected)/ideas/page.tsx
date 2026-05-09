"use client";

import { useEffect, useState, useCallback } from "react";
import { Pencil, Trash2, Check, RotateCcw, GripVertical, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Idea {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  source: string | null;
  status: string | null;
  sortOrder: number;
  timestamp: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  business:   "#6366f1",
  tech:       "#0ea5e9",
  personal:   "#10b981",
  consulting: "#f59e0b",
  aa:         "#8b5cf6",
  content:    "#ec4899",
  product:    "#14b8a6",
};

const CATEGORY_OPTIONS = ["business", "tech", "personal", "consulting", "aa", "content", "product"];

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

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Idea Card (Open) ─────────────────────────────────────────────────────────

interface OpenIdeaCardProps {
  idea: Idea;
  onMarkDone: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<Idea>) => void;
}

function OpenIdeaCard({ idea, onMarkDone, onDelete, onUpdate }: OpenIdeaCardProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(idea.title);
  const [description, setDescription] = useState(idea.description ?? "");
  const [category, setCategory] = useState(idea.category ?? "");
  const [saving, setSaving] = useState(false);

  const startEdit = () => {
    setTitle(idea.title);
    setDescription(idea.description ?? "");
    setCategory(idea.category ?? "");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const saveEdit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    const patch = {
      title: title.trim(),
      description: description || null,
      category: category || null,
    };
    await fetch(`/api/ideas/${idea.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    setEditing(false);
    onUpdate(idea.id, patch);
  };

  const handleDelete = () => {
    if (confirm(`Delete "${idea.title}"? This cannot be undone.`)) {
      onDelete(idea.id);
    }
  };

  const handleMarkDone = () => {
    onMarkDone(idea.id);
  };

  return (
    <div
      className="p-4 rounded-xl relative"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      {editing ? (
        /* ── Inline edit form ── */
        <div className="flex flex-col gap-2">
          <input
            autoFocus
            className="text-sm px-3 py-1.5 rounded-lg w-full"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title *"
            onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
          />
          <textarea
            className="text-sm px-3 py-1.5 rounded-lg w-full resize-none"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)", minHeight: 64 }}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            onKeyDown={(e) => { if (e.key === "Escape") cancelEdit(); }}
          />
          <select
            className="text-sm px-3 py-1.5 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">No category</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <button
              onClick={saveEdit}
              disabled={saving || !title.trim()}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "#10b981", color: "#000", opacity: saving ? 0.6 : 1 }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={cancelEdit}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* ── Card view ── */
        <>
          <div className="flex items-start justify-between gap-3">
            <span className="font-medium text-[14px] flex-1" style={{ color: "var(--ink-1)" }}>
              {idea.title}
            </span>
            <div className="flex items-center gap-1 flex-none">
              {/* Edit */}
              <button
                onClick={startEdit}
                className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
                style={{ color: "var(--ink-3)" }}
                title="Edit"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              {/* Mark done */}
              <button
                onClick={handleMarkDone}
                className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
                style={{ color: "#10b981" }}
                title="Mark done"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              {/* Delete */}
              <button
                onClick={handleDelete}
                className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
                style={{ color: "#ef4444" }}
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {idea.description && (
            <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--ink-2)" }}>
              {idea.description}
            </p>
          )}

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {idea.category && (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full capitalize font-medium"
                style={{
                  background: categoryColor(idea.category) + "22",
                  color: categoryColor(idea.category),
                }}
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                  style={{ background: categoryColor(idea.category), verticalAlign: "middle" }}
                />
                {idea.category}
              </span>
            )}
            <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
              {timeAgo(idea.timestamp)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Sortable wrapper for open ideas ─────────────────────────────────────────

function SortableIdeaCard(props: OpenIdeaCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.idea.id,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="drag-handle"
        style={{
          position: "absolute",
          left: -20,
          top: 12,
          cursor: "grab",
          color: "var(--ink-3)",
          opacity: 0,
          transition: "opacity 0.15s",
          zIndex: 10,
        }}
        title="Drag to reorder"
      >
        <GripVertical style={{ width: 14, height: 14 }} />
      </div>
      <OpenIdeaCard {...props} />
    </div>
  );
}

// ─── Completed Idea Card ──────────────────────────────────────────────────────

interface DoneIdeaCardProps {
  idea: Idea;
  onReopen: (id: string) => void;
  onDelete: (id: string) => void;
}

function DoneIdeaCard({ idea, onReopen, onDelete }: DoneIdeaCardProps) {
  const handleDelete = () => {
    if (confirm(`Delete "${idea.title}"? This cannot be undone.`)) {
      onDelete(idea.id);
    }
  };

  return (
    <div
      className="p-4 rounded-xl"
      style={{ background: "var(--panel)", border: "1px solid var(--line)", opacity: 0.85 }}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className="font-medium text-[14px] flex-1 line-through"
          style={{ color: "var(--ink-3)" }}
        >
          {idea.title}
        </span>
        <div className="flex items-center gap-1 flex-none">
          {/* Reopen */}
          <button
            onClick={() => onReopen(idea.id)}
            className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
            style={{ color: "var(--ink-2)" }}
            title="Reopen"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          {/* Delete */}
          <button
            onClick={handleDelete}
            className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
            style={{ color: "#ef4444" }}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {idea.description && (
        <p className="text-[13px] mt-1 leading-relaxed" style={{ color: "var(--ink-3)" }}>
          {idea.description}
        </p>
      )}

      <div className="flex items-center gap-2 mt-2 flex-wrap">
        {idea.category && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full capitalize"
            style={{
              background: categoryColor(idea.category) + "15",
              color: "var(--ink-3)",
            }}
          >
            {idea.category}
          </span>
        )}
        <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
          Completed · {fmtDate(idea.timestamp)}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/ideas")
      .then((r) => r.json())
      .then((d) => { setIdeas(d.ideas); setError(null); })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  // Derived lists
  const openIdeas = ideas
    ? (filter === "all"
        ? ideas.filter((i) => i.status !== "done")
        : ideas.filter((i) => i.status !== "done" && i.category === filter)
      ).sort((a, b) => a.sortOrder - b.sortOrder)
    : [];

  const doneIdeas = ideas
    ? (filter === "all"
        ? ideas.filter((i) => i.status === "done")
        : ideas.filter((i) => i.status === "done" && i.category === filter)
      ).sort((a, b) => b.sortOrder - a.sortOrder)
    : [];

  const categories = ideas
    ? Array.from(new Set(ideas.map((i) => i.category).filter(Boolean))) as string[]
    : [];

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleUpdate = (id: string, data: Partial<Idea>) => {
    setIdeas((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, ...data } : i)) : prev
    );
  };

  const handleMarkDone = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "done" }),
    });
    setIdeas((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, status: "done" } : i)) : prev
    );
  };

  const handleReopen = async (id: string) => {
    await fetch(`/api/ideas/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "pending" }),
    });
    setIdeas((prev) =>
      prev ? prev.map((i) => (i.id === id ? { ...i, status: "pending" } : i)) : prev
    );
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/ideas/${id}`, { method: "DELETE" });
    setIdeas((prev) => (prev ? prev.filter((i) => i.id !== id) : prev));
  };

  // ── Drag & drop ───────────────────────────────────────────────────────────

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !ideas) return;

    const subset = openIdeas; // only open ideas are draggable
    const oldIndex = subset.findIndex((i) => i.id === active.id);
    const newIndex = subset.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(subset, oldIndex, newIndex);

    // Optimistic update
    const newOrders = new Map(reordered.map((idea, idx) => [idea.id, idx]));
    setIdeas((prev) =>
      prev
        ? prev.map((i) =>
            newOrders.has(i.id) ? { ...i, sortOrder: newOrders.get(i.id)! } : i
          )
        : prev
    );

    await fetch("/api/ideas/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <style>{`.drag-handle-wrap:hover .drag-handle { opacity: 1 !important; }`}</style>

      {/* ── Header ── */}
      <div
        className="px-6 py-4 border-b flex items-center justify-between flex-none"
        style={{ borderColor: "var(--line)" }}
      >
        <div>
          <h1 className="font-semibold text-[22px] tracking-[-0.02em]">Ideas</h1>
          <p className="text-[13px] mt-0.5" style={{ color: "var(--ink-3)" }}>
            Einstein drops ideas here as you share them.
            {ideas ? ` ${ideas.length} total.` : ""}
          </p>
        </div>
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
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      {/* ── Category filter pills ── */}
      {categories.length > 0 && (
        <div
          className="px-6 py-3 border-b flex flex-wrap gap-2 flex-none"
          style={{ borderColor: "var(--line)" }}
        >
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
              <span
                className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                style={{ background: filter === cat ? "#fff" : categoryColor(cat), verticalAlign: "middle" }}
              />
              {cat}
            </button>
          ))}
          {filter !== "all" && (
            <button
              onClick={() => setFilter("all")}
              className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
              style={{ color: "var(--ink-3)", border: "1px solid var(--line)", background: "var(--panel)" }}
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {error && (
        <div
          className="mx-6 mt-4 p-4 rounded-xl text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
        >
          Could not load ideas: {error}
        </div>
      )}

      {/* ── Two-column board ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Column 1: Open Ideas */}
        <div
          className="flex flex-col flex-1 border-r overflow-hidden"
          style={{ borderColor: "var(--line)" }}
        >
          <div
            className="px-6 py-3 border-b flex-none"
            style={{ borderColor: "var(--line)" }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ink-3)" }}
            >
              Open Ideas
              {openIdeas.length > 0 && (
                <span className="ml-2 font-normal">{openIdeas.length}</span>
              )}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading && !ideas ? (
              <div className="text-center py-8 text-sm" style={{ color: "var(--ink-3)" }}>
                Loading…
              </div>
            ) : openIdeas.length === 0 ? (
              <div
                className="p-8 rounded-xl text-center"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
              >
                {filter === "all"
                  ? "No open ideas. Tell Einstein an idea to get started."
                  : `No open ideas in "${filter}".`}
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={openIdeas.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="flex flex-col gap-2">
                    {openIdeas.map((idea) => (
                      <div
                        key={idea.id}
                        className="drag-handle-wrap"
                        style={{ paddingLeft: 20, marginLeft: -20 }}
                      >
                        <SortableIdeaCard
                          idea={idea}
                          onMarkDone={handleMarkDone}
                          onDelete={handleDelete}
                          onUpdate={handleUpdate}
                        />
                      </div>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>

        {/* Column 2: Completed */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <div
            className="px-6 py-3 border-b flex-none"
            style={{ borderColor: "var(--line)" }}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--ink-3)" }}
            >
              Completed
              {doneIdeas.length > 0 && (
                <span className="ml-2 font-normal">{doneIdeas.length}</span>
              )}
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {doneIdeas.length === 0 ? (
              <div
                className="p-8 rounded-xl text-center"
                style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
              >
                {filter === "all"
                  ? "No completed ideas yet."
                  : `No completed ideas in "${filter}".`}
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {doneIdeas.map((idea) => (
                  <DoneIdeaCard
                    key={idea.id}
                    idea={idea}
                    onReopen={handleReopen}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
