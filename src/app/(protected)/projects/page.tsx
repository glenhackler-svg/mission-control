"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Plus, ChevronDown, ChevronRight, Clock, Play, Square, Check, Circle, Loader2, Pencil, X, Trash2, GripVertical } from "lucide-react";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface Project {
  id: number;
  name: string;
  color: string | null;
  clientName: string | null;
  notes: string | null;
  taskCount: number;
  doneCount: number;
  totalSeconds: number;
}

interface TimeEntry {
  id: number;
  taskId: number;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number | null;
  note: string | null;
}

interface Client {
  id: string;
  name: string;
  slug: string;
}

interface Task {
  id: number;
  projectId: number;
  title: string;
  notes: string | null;
  status: string;
  dueDate: string | null;
  assignee: string | null;
  completedAt: string | null;
  createdAt: string;
  sortOrder: number;
  clientId: string | null;
  clientVisible: boolean;
  timeEntries?: TimeEntry[];
}

// ─── Color utilities ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  aqua:   "#06b6d4",
  blue:   "#3b82f6",
  indigo: "#6366f1",
  green:  "#10b981",
  red:    "#ef4444",
  orange: "#f97316",
  yellow: "#eab308",
  purple: "#a855f7",
  pink:   "#ec4899",
  teal:   "#14b8a6",
};

function colorHex(color: string | null): string {
  if (!color) return "#6b7280";
  return COLOR_MAP[color.toLowerCase()] ?? "#6b7280";
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function fmtDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtProjectTime(seconds: number): string {
  if (seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m > 0 ? m + "m" : ""}`.trim();
  if (m > 0) return `${m}m`;
  return "<1m";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

function totalTracked(entries: TimeEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.durationSeconds ?? 0), 0);
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  todo:        "To Do",
  in_progress: "In Progress",
  done:        "Done",
};

const STATUS_COLOR: Record<string, string> = {
  todo:        "#ffffff",
  in_progress: "#f59e0b",
  done:        "#10b981",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className="text-[11px] px-2 py-0.5 rounded-full font-bold"
      style={{ background: STATUS_COLOR[status] + "22", color: STATUS_COLOR[status] }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

// Live timer that ticks every second for running entries
function LiveTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  return <span className="font-mono text-[11px]" style={{ color: "#f59e0b" }}>{fmtDuration(elapsed)}</span>;
}

// ─── Project Description Panel ──────────────────────────────────────────────

interface ProjectDescriptionPanelProps {
  project: Project;
  onSaved: (notes: string | null) => void;
}

function ProjectDescriptionPanel({ project, onSaved }: ProjectDescriptionPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(project.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Sync value when project changes
  useEffect(() => {
    if (!editing) setValue(project.notes ?? "");
  }, [project.id, project.notes, editing]);

  const startEditing = () => {
    setValue(project.notes ?? "");
    setExpanded(true);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const save = async () => {
    if (saving) return;
    setSaving(true);
    await fetch(`/api/tasks/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: value || null }),
    });
    setSaving(false);
    setEditing(false);
    onSaved(value || null);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && e.metaKey) {
      e.preventDefault();
      save();
    }
    if (e.key === "Escape") {
      setEditing(false);
      setValue(project.notes ?? "");
    }
  };

  return (
    <div
      className="mb-4 rounded-xl relative"
      style={{ border: "1px solid var(--line)", background: "var(--panel)" }}
    >
      {/* Collapsed header — always visible */}
      <button
        onClick={() => { setExpanded((v) => !v); setEditing(false); }}
        className="w-full flex items-center justify-between px-4 py-2.5 text-left"
      >
        <span className="text-[12px] font-medium" style={{ color: "var(--ink-3)" }}>
          {project.notes ? "Project Description" : "Add Project Description"}
        </span>
        <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-3">
      {editing ? (
        <>
          <textarea
            ref={textareaRef}
            className="w-full text-[13px] resize-none bg-transparent outline-none"
            style={{
              color: "var(--ink-2)",
              minHeight: 64,
              lineHeight: "1.6",
            }}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={save}
            onKeyDown={handleKeyDown}
            placeholder="Add a project description..."
          />
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
              {saving ? "Saving..." : "Cmd+Enter to save · Esc to cancel"}
            </span>
          </div>
        </>
      ) : (
        <button
          onClick={startEditing}
          className="w-full text-left"
        >
          {project.notes ? (
            <p
              className="text-[13px] whitespace-pre-wrap leading-relaxed"
              style={{ color: "var(--ink-2)" }}
            >
              {project.notes}
            </p>
          ) : (
            <p
              className="text-[13px]"
              style={{ color: "var(--ink-3)" }}
            >
              Add a project description...
            </p>
          )}
        </button>
      )}
        </div>
      )}
      {savedFlash && (
        <span
          className="absolute right-3 top-3 text-[11px] px-2 py-0.5 rounded-full"
          style={{ background: "#10b98122", color: "#10b981" }}
        >
          Saved
        </span>
      )}
    </div>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onStatusToggle: (task: Task) => void;
  onExpand: (taskId: number) => void;
  expanded: boolean;
  onUpdate: () => void;
  onDelete: (taskId: number) => void;
  clients: Client[];
}

function TaskRow({ task, onStatusToggle, onExpand, expanded, onUpdate, onDelete, clients }: TaskRowProps) {
  const [detail, setDetail] = useState<Task | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesVal, setNotesVal] = useState(task.notes ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualHours, setManualHours] = useState("");
  const [manualMins, setManualMins] = useState("");
  const [manualNote, setManualNote] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editNote, setEditNote] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editingTask, setEditingTask] = useState(false);
  const [taskTitle, setTaskTitle] = useState(task.title);
  const [taskAssignee, setTaskAssignee] = useState(task.assignee ?? "");
  const [taskDueDate, setTaskDueDate] = useState(task.dueDate ? task.dueDate.split("T")[0] : "");

  const fetchDetail = useCallback(async () => {
    setLoadingDetail(true);
    try {
      const r = await fetch(`/api/tasks/${task.id}`);
      const d = await r.json();
      setDetail(d.task);
      const running = d.task.timeEntries?.some((e: TimeEntry) => !e.endedAt);
      setTimerRunning(running ?? false);
    } finally {
      setLoadingDetail(false);
    }
  }, [task.id]);

  useEffect(() => {
    if (expanded) fetchDetail();
  }, [expanded, fetchDetail]);

  const handleTimer = async () => {
    const action = timerRunning ? "stop" : "start";
    const r = await fetch(`/api/tasks/${task.id}/timer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (r.ok) {
      setTimerRunning(!timerRunning);
      await fetchDetail();
      onUpdate();
    }
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: notesVal }),
    });
    setSavingNotes(false);
    setEditingNotes(false);
    onUpdate();
  };

  const saveTaskEdit = async () => {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: taskTitle,
        assignee: taskAssignee || null,
        dueDate: taskDueDate || null,
      }),
    });
    setEditingTask(false);
    onUpdate();
  };

  const submitManualEntry = async () => {
    const h = parseFloat(manualHours) || 0;
    const m = parseFloat(manualMins) || 0;
    const seconds = Math.round(h * 3600 + m * 60);
    if (seconds <= 0) return;
    const now = new Date();
    const started = new Date(now.getTime() - seconds * 1000);
    await fetch(`/api/tasks/${task.id}/time-entries`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        started_at: started.toISOString(),
        ended_at: now.toISOString(),
        duration_seconds: seconds,
        note: manualNote || null,
      }),
    });
    setManualHours("");
    setManualMins("");
    setManualNote("");
    setManualEntry(false);
    await fetchDetail();
  };

  const runningEntry = detail?.timeEntries?.find((e) => !e.endedAt);
  const isDone = task.status === "done";

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
    >
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Checkbox */}
        <button
          onClick={() => onStatusToggle(task)}
          className="flex-none w-5 h-5 rounded-full border flex items-center justify-center transition-colors"
          style={{
            borderColor: isDone ? "#10b981" : "var(--line)",
            background: isDone ? "#10b98122" : "transparent",
          }}
          title={isDone ? "Mark as To Do" : "Mark as Done"}
        >
          {isDone && <Check className="w-3 h-3" style={{ color: "#10b981" }} />}
        </button>

        {/* Title */}
        <span
          className={`flex-1 text-[13.5px] ${isDone ? "line-through" : ""}`}
          style={{ color: isDone ? "var(--ink-3)" : "var(--ink)" }}
        >
          {task.title}
        </span>

        {/* Meta */}
        <div className="flex items-center gap-2 flex-none">
          {task.assignee && (
            <span className="text-[11px] font-medium" style={{ color: "#3b82f6" }}>
              {task.assignee}
            </span>
          )}
          {task.dueDate && (
            <span
              className="text-[11px] px-1.5 py-0.5 rounded"
              style={{ background: "var(--bg)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
            >
              {fmtDate(task.dueDate)}
            </span>
          )}
          <StatusBadge status={task.status} />
          <button
            onClick={() => onExpand(task.id)}
            className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
            style={{ color: "var(--ink-3)" }}
          >
            {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => {
              if (confirm(`Delete "${task.title}"? This cannot be undone.`)) {
                onDelete(task.id);
              }
            }}
            className="p-1 rounded hover:bg-[var(--bg)] transition-colors"
            style={{ color: "#ef4444" }}
            title="Delete task"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-4 pb-4 pt-1 border-t"
          style={{ borderColor: "var(--line)" }}
        >
          {loadingDetail ? (
            <div className="flex items-center gap-2 py-2" style={{ color: "var(--ink-3)" }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-4 pt-3">
              {/* Edit task fields */}
              {editingTask ? (
                <div className="flex flex-col gap-2">
                  <input
                    className="text-sm px-3 py-1.5 rounded-lg w-full"
                    style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title"
                  />
                  <div className="flex gap-2">
                    <input
                      className="text-sm px-3 py-1.5 rounded-lg flex-1"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                      value={taskAssignee}
                      onChange={(e) => setTaskAssignee(e.target.value)}
                      placeholder="Assignee"
                    />
                    <input
                      type="date"
                      className="text-sm px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={saveTaskEdit}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "#10b981", color: "#000" }}
                    >Save</button>
                    <button
                      onClick={() => setEditingTask(false)}
                      className="text-xs px-3 py-1.5 rounded-lg"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                    >Cancel</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingTask(true)}
                  className="self-start flex items-center gap-1.5 text-xs"
                  style={{ color: "var(--ink-3)" }}
                >
                  <Pencil className="w-3 h-3" /> Edit task
                </button>
              )}

              {/* Status selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: "var(--ink-3)" }}>Status:</span>
                {(["todo", "in_progress", "done"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={async () => {
                      await fetch(`/api/tasks/${task.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: s }),
                      });
                      onUpdate();
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{
                      background: task.status === s ? STATUS_COLOR[s] + "33" : "var(--bg)",
                      color: task.status === s ? STATUS_COLOR[s] : "var(--ink-3)",
                      border: `1px solid ${task.status === s ? STATUS_COLOR[s] : "var(--line)"}`,
                    }}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                ))}
              </div>

              {/* Notes */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>Notes</span>
                  {!editingNotes && (
                    <button
                      onClick={() => { setNotesVal(detail?.notes ?? ""); setEditingNotes(true); }}
                      className="text-[11px]"
                      style={{ color: "var(--ink-3)" }}
                    >
                      Edit
                    </button>
                  )}
                </div>
                {editingNotes ? (
                  <div className="flex flex-col gap-2">
                    <textarea
                      className="w-full text-sm px-3 py-2 rounded-lg resize-none"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)", minHeight: 80 }}
                      value={notesVal}
                      onChange={(e) => setNotesVal(e.target.value)}
                      placeholder="Add notes..."
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveNotes}
                        disabled={savingNotes}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "#10b981", color: "#000" }}
                      >
                        {savingNotes ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p
                    className="text-[13px] whitespace-pre-wrap"
                    style={{ color: detail?.notes ? "var(--ink-2)" : "var(--ink-3)" }}
                  >
                    {detail?.notes || "No notes yet. Click Edit to add some."}
                  </p>
                )}
              </div>

              {/* Time tracking */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" style={{ color: "var(--ink-3)" }} />
                    <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>Time Tracking</span>
                    {detail?.timeEntries && detail.timeEntries.length > 0 && (
                      <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                        {fmtDuration(totalTracked(detail.timeEntries.filter(e => e.endedAt !== null)))} total
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {runningEntry && <LiveTimer startedAt={runningEntry.startedAt} />}
                    <button
                      onClick={handleTimer}
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors"
                      style={{
                        background: timerRunning ? "#ef444422" : "#10b98122",
                        color: timerRunning ? "#ef4444" : "#10b981",
                        border: `1px solid ${timerRunning ? "#ef4444" : "#10b981"}`,
                      }}
                    >
                      {timerRunning ? (
                        <><Square className="w-3 h-3" /> Stop</>
                      ) : (
                        <><Play className="w-3 h-3" /> Start</>
                      )}
                    </button>
                    <button
                      onClick={() => setManualEntry(!manualEntry)}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-3)" }}
                    >
                      + Manual
                    </button>
                  </div>
                </div>

                {/* Manual entry form */}
                {manualEntry && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <input
                      className="text-xs px-2 py-1 rounded w-16 text-center"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                      placeholder="hrs"
                      value={manualHours}
                      onChange={(e) => setManualHours(e.target.value)}
                      type="number"
                      min="0"
                    />
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>h</span>
                    <input
                      className="text-xs px-2 py-1 rounded w-16 text-center"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                      placeholder="mins"
                      value={manualMins}
                      onChange={(e) => setManualMins(e.target.value)}
                      type="number"
                      min="0"
                      max="59"
                    />
                    <span className="text-xs" style={{ color: "var(--ink-3)" }}>m</span>
                    <input
                      className="text-xs px-2 py-1 rounded flex-1"
                      style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
                      placeholder="Note (optional)"
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                    />
                    <button
                      onClick={submitManualEntry}
                      className="text-xs px-2.5 py-1 rounded-lg"
                      style={{ background: "#10b981", color: "#000" }}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setManualEntry(false)}
                      className="p-1 rounded"
                      style={{ color: "var(--ink-3)" }}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {/* Time entries log */}
                {detail?.timeEntries && detail.timeEntries.length > 0 && (
                  <div className="flex flex-col gap-1 mt-1">
                    {detail.timeEntries.map((entry) => (
                      <div key={entry.id}>
                        <div
                          className="flex items-center gap-2 text-[11px] px-2 py-1 rounded group"
                          style={{ background: "var(--bg)", color: "var(--ink-3)" }}
                        >
                          <Clock className="w-3 h-3 flex-none" />
                          {entry.endedAt ? (
                            <>
                              <span className="font-medium" style={{ color: "var(--ink-2)" }}>
                                {fmtDuration(entry.durationSeconds ?? 0)}
                              </span>
                              <span>·</span>
                              <span>{fmtDateTime(entry.startedAt)}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ color: "#f59e0b" }}>Running</span>
                              <span>·</span>
                              <span>Started {fmtDateTime(entry.startedAt)}</span>
                            </>
                          )}
                          {entry.note && <span>· {entry.note}</span>}
                          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => {
                                setEditingEntryId(entry.id);
                                setEditNote(entry.note ?? "");
                                setEditHours(entry.durationSeconds ? String(Math.round(entry.durationSeconds / 36) / 100) : "");
                              }}
                              style={{ color: "var(--ink-2)", background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                              title="Edit entry"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm("Delete this time entry?")) return;
                                await fetch(`/api/tasks/${task.id}/time-entries/${entry.id}`, { method: "DELETE" });
                                await fetchDetail();
                              }}
                              style={{ color: "#ef4444", background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                              title="Delete entry"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        {/* Inline edit form */}
                        {editingEntryId === entry.id && (
                          <div
                            className="flex flex-col gap-2 px-2 py-2 rounded mt-1 mb-1"
                            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
                          >
                            <div className="flex gap-2">
                              <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px]" style={{ color: "var(--ink-3)" }}>Hours</label>
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  value={editHours}
                                  onChange={(e) => setEditHours(e.target.value)}
                                  className="text-[11px] px-2 py-1 rounded"
                                  style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-1)", width: "80px" }}
                                />
                              </div>
                              <div className="flex flex-col gap-1 flex-1">
                                <label className="text-[10px]" style={{ color: "var(--ink-3)" }}>Note</label>
                                <input
                                  type="text"
                                  value={editNote}
                                  onChange={(e) => setEditNote(e.target.value)}
                                  placeholder="Add a note..."
                                  className="text-[11px] px-2 py-1 rounded"
                                  style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-1)", flex: 1 }}
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => setEditingEntryId(null)}
                                className="text-[11px] px-2 py-1 rounded"
                                style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)", cursor: "pointer" }}
                              >
                                Cancel
                              </button>
                              <button
                                onClick={async () => {
                                  const hrs = parseFloat(editHours);
                                  await fetch(`/api/tasks/${task.id}/time-entries/${entry.id}`, {
                                    method: "PATCH",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                      ...(editHours !== "" && !isNaN(hrs) && { duration_seconds: Math.round(hrs * 3600) }),
                                      note: editNote || null,
                                    }),
                                  });
                                  setEditingEntryId(null);
                                  await fetchDetail();
                                }}
                                className="text-[11px] px-2 py-1 rounded"
                                style={{ background: "var(--accent, #6366f1)", border: "none", color: "#fff", cursor: "pointer" }}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Client assignment */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium" style={{ color: "var(--ink-2)" }}>Assign to Client</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="text-xs px-2 py-1.5 rounded-lg"
                    style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)", minWidth: 160 }}
                    value={task.clientId ?? ""}
                    onChange={async (e) => {
                      await fetch(`/api/tasks/${task.id}/assign`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ clientId: e.target.value || null }),
                      });
                      onUpdate();
                    }}
                  >
                    <option value="">Unassigned</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: "var(--ink-2)" }}>
                    <input
                      type="checkbox"
                      checked={task.clientVisible}
                      onChange={async (e) => {
                        await fetch(`/api/tasks/${task.id}/assign`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ clientId: task.clientId, clientVisible: e.target.checked }),
                        });
                        onUpdate();
                      }}
                    />
                    Client visible
                  </label>
                </div>
              </div>

              {/* Completion info */}
              {task.completedAt && (
                <div className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                  Completed {fmtDateTime(task.completedAt)}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Sortable Task Row wrapper ──────────────────────────────────────────────

// Clients passed from main page
function SortableTaskRow(props: TaskRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.task.id });
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
        className="drag-handle"
        title="Drag to reorder"
      >
        <GripVertical style={{ width: 14, height: 14 }} />
      </div>
      <TaskRow {...props} />
    </div>
  );
}

// ─── Add Task Modal ───────────────────────────────────────────────────────────

interface AddTaskModalProps {
  projectId: number;
  clients: Client[];
  onClose: () => void;
  onAdded: () => void;
}

function AddTaskModal({ projectId, clients, onClose, onAdded }: AddTaskModalProps) {
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: projectId,
        title: title.trim(),
        notes: notes || null,
        due_date: dueDate || null,
        client_id: clientId || null,
      }),
    });
    setSaving(false);
    onAdded();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={submit}
        className="rounded-2xl p-6 w-full max-w-md flex flex-col gap-4"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Add Task</h2>
          <button type="button" onClick={onClose} style={{ color: "var(--ink-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          autoFocus
          required
          className="text-sm px-3 py-2 rounded-lg w-full"
          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
          placeholder="Task title *"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <textarea
          className="text-sm px-3 py-2 rounded-lg w-full resize-none"
          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)", minHeight: 80 }}
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-3">
          <select
            className="text-sm px-3 py-2 rounded-lg flex-1"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: clientId ? "var(--ink)" : "var(--ink-3)" }}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Assign to client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <input
            type="date"
            className="text-sm px-3 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "#10b981", color: "#000", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Adding..." : "Add Task"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Add/Edit Project Modal ───────────────────────────────────────────────────

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
  onSaved: () => void;
}

const COLOR_OPTIONS = ["aqua","blue","indigo","green","red","orange","yellow","purple","pink","teal"];

function ProjectModal({ project, onClose, onSaved }: ProjectModalProps) {
  const [name, setName] = useState(project?.name ?? "");
  const [clientName, setClientName] = useState(project?.clientName ?? "");
  const [color, setColor] = useState(project?.color ?? "blue");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    if (project) {
      await fetch(`/api/tasks/projects/${project.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientName: clientName || null, color }),
      });
    } else {
      await fetch("/api/tasks/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, clientName: clientName || null, color }),
      });
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <form
        onSubmit={submit}
        className="rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4"
        style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">{project ? "Edit Project" : "New Project"}</h2>
          <button type="button" onClick={onClose} style={{ color: "var(--ink-3)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          autoFocus
          required
          className="text-sm px-3 py-2 rounded-lg w-full"
          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
          placeholder="Project name *"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="text-sm px-3 py-2 rounded-lg w-full"
          style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink)" }}
          placeholder="Client name (optional)"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
        />

        <div>
          <label className="text-xs mb-2 block" style={{ color: "var(--ink-3)" }}>Color</label>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-6 h-6 rounded-full border-2 transition-transform"
                style={{
                  background: colorHex(c),
                  borderColor: color === c ? "#fff" : "transparent",
                  transform: color === c ? "scale(1.2)" : "scale(1)",
                }}
              />
            ))}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "var(--bg)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="text-sm px-4 py-2 rounded-lg"
            style={{ background: "#10b981", color: "#000", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : project ? "Save" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Sortable Project Item ────────────────────────────────────────────────────

interface SortableProjectItemProps {
  project: Project;
  active: boolean;
  onSelect: () => void;
}

function SortableProjectItem({ project, active, onSelect }: SortableProjectItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id });
  const progressPct = project.taskCount > 0 ? (project.doneCount / project.taskCount) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        position: "relative",
      }}
      className="group"
    >
      {/* Drag handle — appears on hover */}
      <div
        {...attributes}
        {...listeners}
        style={{
          position: "absolute",
          left: -16,
          top: "50%",
          transform: "translateY(-50%)",
          cursor: "grab",
          color: "var(--ink-3)",
          opacity: 0,
          zIndex: 10,
        }}
        className="project-drag-handle"
        title="Drag to reorder"
      >
        <GripVertical style={{ width: 12, height: 12 }} />
      </div>

      <button
        onClick={onSelect}
        className="flex flex-col gap-1 px-2.5 py-2.5 rounded-lg text-left transition-colors w-full"
        style={{
          background: active ? "var(--panel)" : "transparent",
          border: active ? "1px solid var(--line)" : "1px solid transparent",
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-2.5 h-2.5 rounded-full flex-none"
            style={{ background: colorHex(project.color) }}
          />
          <span
            className="text-[13px] font-medium truncate flex-1"
            style={{ color: active ? "var(--ink)" : "var(--ink-2)" }}
          >
            {project.name}
          </span>
        </div>
        {project.clientName && (
          <span className="text-[11px] pl-4.5" style={{ color: "var(--ink-3)", paddingLeft: "18px" }}>
            {project.clientName}
          </span>
        )}
        <div className="flex items-center gap-2 pl-4.5" style={{ paddingLeft: "18px" }}>
          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, background: colorHex(project.color) }}
            />
          </div>
          <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>
            {project.doneCount}/{project.taskCount}
          </span>
        </div>
        {project.totalSeconds > 0 && (
          <div className="flex items-center gap-1" style={{ paddingLeft: "18px" }}>
            <Clock className="w-2.5 h-2.5" style={{ color: "var(--ink-3)" }} />
            <span className="text-[10px]" style={{ color: "var(--ink-3)" }}>
              {fmtProjectTime(project.totalSeconds)}
            </span>
          </div>
        )}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [projectNotesOverride, setProjectNotesOverride] = useState<Record<number, string | null>>({});
  const [clients, setClients] = useState<Client[]>([]);

  const loadProjects = useCallback(async () => {
    const r = await fetch("/api/tasks/projects");
    const d = await r.json();
    setProjects(d.projects ?? []);
    setLoadingProjects(false);
  }, []);

  const loadTasks = useCallback(async (projectId: number) => {
    setLoadingTasks(true);
    const r = await fetch(`/api/tasks?project_id=${projectId}`);
    const d = await r.json();
    setTasks(d.tasks ?? []);
    setLoadingTasks(false);
  }, []);

  useEffect(() => {
    loadProjects();
    fetch("/api/clients").then((r) => r.json()).then((d) => setClients(d.clients ?? []));
  }, [loadProjects]);

  useEffect(() => {
    if (projects.length > 0 && selectedProjectId === null) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId !== null) {
      loadTasks(selectedProjectId);
    }
  }, [selectedProjectId, loadTasks]);

  const handleStatusToggle = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await fetch(`/api/tasks/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (selectedProjectId) {
      await loadTasks(selectedProjectId);
      await loadProjects();
    }
  };

  const handleExpand = (taskId: number) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  const handleUpdate = () => {
    if (selectedProjectId) {
      loadTasks(selectedProjectId);
      loadProjects();
    }
  };

  const handleDelete = async (taskId: number) => {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    handleUpdate();
  };

  const selectedProjectRaw = projects.find((p) => p.id === selectedProjectId);
  const selectedProject = selectedProjectRaw
    ? {
        ...selectedProjectRaw,
        notes:
          selectedProjectId !== null && projectNotesOverride[selectedProjectId] !== undefined
            ? projectNotesOverride[selectedProjectId]
            : selectedProjectRaw.notes,
      }
    : undefined;

  // Active = todo + in_progress, sorted by user-defined order
  const activeTasks = tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // Done = completed tasks, sorted by completedAt desc (newest first), then sortOrder
  const doneTasks = tasks
    .filter((t) => t.status === "done")
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime();
    });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleProjectDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = projects.findIndex((p) => p.id === active.id);
    const newIndex = projects.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(projects, oldIndex, newIndex);
    setProjects(reordered); // optimistic update
    await fetch("/api/tasks/projects/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
    });
  }, [projects]);

  const makeHandleDragEnd = useCallback((subset: Task[]) => async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = subset.findIndex((t) => t.id === active.id);
    const newIndex = subset.findIndex((t) => t.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(subset, oldIndex, newIndex);
    const reorderedIds = new Set(reordered.map((t) => t.id));
    const other = tasks.filter((t) => !reorderedIds.has(t.id));
    const merged = [...reordered, ...other];
    // Save to DB first, then reload — avoids optimistic state fighting DnD animations
    await fetch("/api/tasks/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds: merged.map((t) => t.id) }),
    });
    if (selectedProjectId) loadTasks(selectedProjectId);
  }, [tasks, selectedProjectId, loadTasks]);

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ─── Left Sidebar: Projects ──────────────────────────────────── */}
      <aside
        className="flex flex-col border-r overflow-y-auto"
        style={{ width: 260, borderColor: "var(--line)", background: "var(--bg)" }}
      >
        <div className="p-4 border-b" style={{ borderColor: "var(--line)" }}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-semibold text-[13px]" style={{ color: "var(--ink)" }}>Projects</h2>
            <button
              onClick={() => { setEditingProject(undefined); setShowProjectModal(true); }}
              className="p-1 rounded hover:bg-[var(--panel)] transition-colors"
              style={{ color: "var(--ink-3)" }}
              title="New project"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <style>{`.group:hover .project-drag-handle { opacity: 1 !important; }`}</style>
        <nav className="flex flex-col gap-0.5 p-2" style={{ paddingLeft: 20 }}>
          {loadingProjects ? (
            <div className="px-2 py-4 text-center text-xs" style={{ color: "var(--ink-3)" }}>
              Loading...
            </div>
          ) : projects.length === 0 ? (
            <div className="px-2 py-4 text-center text-xs" style={{ color: "var(--ink-3)" }}>
              No projects yet
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleProjectDragEnd}>
              <SortableContext items={projects.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                {projects.map((project) => (
                  <SortableProjectItem
                    key={project.id}
                    project={project}
                    active={selectedProjectId === project.id}
                    onSelect={() => {
                      setSelectedProjectId(project.id);
                      setExpandedTaskId(null);
                      setFilterStatus("all");
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
        </nav>
      </aside>

      {/* ─── Main Content: Task List ──────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between flex-none"
          style={{ borderColor: "var(--line)" }}
        >
          <div className="flex items-center gap-3">
            {selectedProject && (
              <>
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ background: colorHex(selectedProject.color) }}
                />
                <div>
                  <h1 className="font-semibold text-[18px] tracking-[-0.01em]">{selectedProject.name}</h1>
                  {selectedProject.clientName && (
                    <p className="text-xs mt-0.5" style={{ color: "var(--ink-3)" }}>{selectedProject.clientName}</p>
                  )}
                </div>
                <button
                  onClick={() => { setEditingProject(selectedProject); setShowProjectModal(true); }}
                  className="p-1 rounded hover:bg-[var(--panel)] transition-colors ml-1"
                  style={{ color: "var(--ink-3)" }}
                  title="Edit project"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {selectedProjectId && (
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                style={{ background: "#3b82f6", color: "#fff" }}
              >
                <Plus className="w-3.5 h-3.5" />
                Add Task
              </button>
            )}
            {selectedProject && (
              <div
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                style={{ background: "var(--panel)", border: "1px solid #10b981", color: "var(--ink-2)" }}
              >
                <Clock className="w-3.5 h-3.5" style={{ color: "var(--ink-3)" }} />
                {selectedProject.totalSeconds > 0 ? fmtProjectTime(selectedProject.totalSeconds) : "0m"}
              </div>
            )}
          </div>
        </div>

        {/* Two-column task area */}
        <style>{`.drag-handle-wrap:hover .drag-handle { opacity: 1 !important; }`}</style>
        <div className="flex-1 overflow-hidden">
          {!selectedProjectId ? (
            <div className="flex flex-col items-center justify-center h-full text-center" style={{ color: "var(--ink-3)" }}>
              <Circle className="w-8 h-8 mb-3 opacity-30" />
              <p className="text-sm">Select a project from the sidebar</p>
            </div>
          ) : loadingTasks ? (
            <div className="flex items-center justify-center h-32" style={{ color: "var(--ink-3)" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : (
            <div className="flex h-full">
              {/* ── Column 1: Active ──────────────────────────────── */}
              <div className="flex flex-col flex-1 border-r overflow-hidden" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--line)" }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    To Do &amp; In Progress
                    {activeTasks.length > 0 && <span className="ml-2 font-normal">{activeTasks.length}</span>}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedProject && (
                    <ProjectDescriptionPanel
                      project={selectedProject}
                      onSaved={(notes) => {
                        if (selectedProjectId !== null) setProjectNotesOverride((prev) => ({ ...prev, [selectedProjectId]: notes }));
                      }}
                    />
                  )}
                  {activeTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center" style={{ color: "var(--ink-3)" }}>
                      <p className="text-sm mb-3">No active tasks.</p>
                      <button
                        onClick={() => setShowAddTask(true)}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
                        style={{ background: "#10b981", color: "#000" }}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add First Task
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeHandleDragEnd(activeTasks)}>
                        <SortableContext items={activeTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          {activeTasks.map((task) => (
                            <div key={task.id} className="drag-handle-wrap" style={{ paddingLeft: 20, marginLeft: -20 }}>
                              <SortableTaskRow
                                task={task}
                                onStatusToggle={handleStatusToggle}
                                onExpand={handleExpand}
                                expanded={expandedTaskId === task.id}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                clients={clients}
                              />
                            </div>
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Column 2: Completed ───────────────────────────── */}
              <div className="flex flex-col flex-1 overflow-hidden">
                <div className="flex items-center justify-between px-6 py-3 border-b" style={{ borderColor: "var(--line)" }}>
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
                    Completed
                    {doneTasks.length > 0 && <span className="ml-2 font-normal">{doneTasks.length}</span>}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {doneTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-center" style={{ color: "var(--ink-3)" }}>
                      <p className="text-sm">No completed tasks yet.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={makeHandleDragEnd(doneTasks)}>
                        <SortableContext items={doneTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                          {doneTasks.map((task) => (
                            <div key={task.id} className="drag-handle-wrap" style={{ paddingLeft: 20, marginLeft: -20 }}>
                              <SortableTaskRow
                                task={task}
                                onStatusToggle={handleStatusToggle}
                                onExpand={handleExpand}
                                expanded={expandedTaskId === task.id}
                                onUpdate={handleUpdate}
                                onDelete={handleDelete}
                                clients={clients}
                              />
                            </div>
                          ))}
                        </SortableContext>
                      </DndContext>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      {showAddTask && selectedProjectId && (
        <AddTaskModal
          projectId={selectedProjectId}
          clients={clients}
          onClose={() => setShowAddTask(false)}
          onAdded={handleUpdate}
        />
      )}
      {showProjectModal && (
        <ProjectModal
          project={editingProject}
          onClose={() => setShowProjectModal(false)}
          onSaved={() => { loadProjects(); }}
        />
      )}
    </div>
  );
}
