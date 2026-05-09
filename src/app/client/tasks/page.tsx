"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, ChevronDown } from "lucide-react";

interface Task {
  id: number;
  title: string;
  notes: string | null;
  status: string;
  dueDate: string | null;
  assignee: string | null;
  completedAt: string | null;
  clientId: string | null;
  clientVisible: boolean;
  project: { name: string; color: string | null };
}

interface Me {
  id: string;
  name: string;
}

const STATUS_LABEL: Record<string, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Done",
};

const STATUS_COLOR: Record<string, string> = {
  todo: "#ffffff",
  in_progress: "#f59e0b",
  done: "#10b981",
};

const COLOR_MAP: Record<string, string> = {
  aqua: "#06b6d4", blue: "#3b82f6", indigo: "#6366f1", green: "#10b981",
  red: "#ef4444", orange: "#f97316", yellow: "#eab308", purple: "#a855f7",
  pink: "#ec4899", teal: "#14b8a6",
};

function colorHex(c: string | null) {
  if (!c) return "#6b7280";
  return COLOR_MAP[c.toLowerCase()] ?? "#6b7280";
}

function fmtDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ClientTasksPage() {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [glenTasks, setGlenTasks] = useState<Task[]>([]);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [projectNames, setProjectNames] = useState<string[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [noProjects, setNoProjects] = useState(false);
  const [changingStatus, setChangingStatus] = useState<number | null>(null);

  const loadData = async () => {
    const [tasksRes, meRes] = await Promise.all([
      fetch("/api/client/tasks"),
      fetch("/api/client/me"),
    ]);
    const tasksData = await tasksRes.json();
    const meData = await meRes.json();
    setMyTasks(tasksData.myTasks ?? []);
    setGlenTasks(tasksData.glenTasks ?? []);
    setCompletedTasks(tasksData.completedTasks ?? []);
    setProjectNames(tasksData.projectNames ?? []);
    setNoProjects(tasksData.noProjects === true);
    setMe(meData.client ?? null);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (taskId: number, status: string) => {
    setChangingStatus(taskId);
    await fetch(`/api/tasks/${taskId}/complete`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadData();
    setChangingStatus(null);
  };

  const isEmpty = myTasks.length === 0 && glenTasks.length === 0 && completedTasks.length === 0;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {projectNames.length > 0
            ? <>{projectNames.join(", ")} <span style={{ color: "var(--ink-3)", fontWeight: 400 }}>— Task Board</span></>
            : "Task Board"}
        </h1>
        {me && (
          <p className="text-sm mt-1" style={{ color: "var(--ink-3)" }}>
            Welcome back, {me.name}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-12 justify-center" style={{ color: "var(--ink-3)" }}>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading tasks…</span>
        </div>
      ) : noProjects ? (
        <div className="text-center py-12" style={{ color: "var(--ink-3)" }}>
          <p className="text-base font-medium mb-1">No projects assigned yet</p>
          <p className="text-sm">Your account hasn&apos;t been assigned to any projects. Please contact your administrator.</p>
        </div>
      ) : isEmpty ? (
        <div className="text-center py-12" style={{ color: "var(--ink-3)" }}>
          No tasks available.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4 items-start">
          {/* Column 1 — Your Tasks */}
          <Column title="Your Tasks" count={myTasks.length}>
            {myTasks.length === 0 ? (
              <EmptyCol message="No tasks assigned to you." />
            ) : (
              myTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  showStatusSelect
                  statusChanging={changingStatus === task.id}
                  onStatusChange={(status) => handleStatusChange(task.id, status)}
                />
              ))
            )}
          </Column>

          {/* Column 2 — Glen's Tasks */}
          <Column title="Glen's Tasks" count={glenTasks.length}>
            {glenTasks.length === 0 ? (
              <EmptyCol message="No tasks from Glen right now." />
            ) : (
              glenTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                />
              ))
            )}
          </Column>

          {/* Column 3 — Completed */}
          <Column title="Completed" count={completedTasks.length}>
            {completedTasks.length === 0 ? (
              <EmptyCol message="No completed tasks yet." />
            ) : (
              completedTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  completedBy={task.clientId ? "Client" : "Glen"}
                />
              ))
            )}
          </Column>
        </div>
      )}
    </div>
  );
}

/* ── Column wrapper ── */
function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden"
      style={{ background: "var(--bg)", border: "1px solid var(--line)" }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: "1px solid var(--line)", background: "var(--panel)" }}
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-3)" }}>
          {title}
        </h2>
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: "var(--line)", color: "var(--ink-3)" }}
        >
          {count}
        </span>
      </div>

      {/* Scrollable card list */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto" style={{ maxHeight: "70vh" }}>
        {children}
      </div>
    </div>
  );
}

function EmptyCol({ message }: { message: string }) {
  return (
    <p className="text-[12px] text-center py-6" style={{ color: "var(--ink-3)" }}>
      {message}
    </p>
  );
}

/* ── Task card ── */
interface TaskCardProps {
  task: Task;
  /** Column 1 only: show interactive status selector */
  showStatusSelect?: boolean;
  statusChanging?: boolean;
  onStatusChange?: (status: string) => void;
  completedBy?: string;
}

function TaskCard({ task, showStatusSelect, statusChanging, onStatusChange, completedBy }: TaskCardProps) {
  const isDone = task.status === "done";

  return (
    <div
      className="flex flex-col gap-2 px-3 py-3 rounded-xl"
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        opacity: isDone ? 0.7 : 1,
      }}
    >
      {/* Top row: status dot + title */}
      <div className="flex items-start gap-2">
        <div
          className="flex-none mt-1 w-2 h-2 rounded-full"
          style={{ background: STATUS_COLOR[task.status] ?? "#6b7280" }}
        />

        <span
          className={`flex-1 text-[13px] leading-snug ${isDone ? "line-through" : ""}`}
          style={{ color: isDone ? "var(--ink-3)" : "var(--ink)" }}
        >
          {task.title}
        </span>
      </div>

      {/* Notes/description (if present) */}
      {task.notes && (
        <p
          className="text-[12px] leading-snug line-clamp-3 pl-4"
          style={{ color: "var(--ink-3)" }}
        >
          {task.notes}
        </p>
      )}

      {/* Meta row: project + due date + status */}
      <div className="flex items-center gap-2 pl-4 flex-wrap">
        {/* Project dot + name */}
        <span className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full flex-none"
            style={{ background: colorHex(task.project?.color) }}
          />
          <span className="text-[11px]" style={{ color: "var(--ink-3)" }}>
            {task.project?.name}
          </span>
        </span>

        {task.dueDate && (
          <span
            className="text-[11px] px-1.5 py-0.5 rounded"
            style={{ background: "var(--bg)", color: "var(--ink-3)", border: "1px solid var(--line)" }}
          >
            {fmtDate(task.dueDate)}
          </span>
        )}

        {completedBy && (
          <span
            className="text-[11px] px-2 py-0.5 rounded-full ml-auto"
            style={{ background: "#6b728022", color: "#9ca3af" }}
          >
            {completedBy}
          </span>
        )}
      </div>

      {/* Status selector — Column 1 (Your Tasks) only */}
      {showStatusSelect && (
        <div className="pl-4 pt-0.5">
          <div className="relative inline-flex items-center">
            <select
              value={task.status}
              disabled={statusChanging}
              onChange={(e) => onStatusChange?.(e.target.value)}
              className="appearance-none text-[11px] font-medium pl-2 pr-6 py-1 rounded-full cursor-pointer transition-colors"
              style={{
                background: STATUS_COLOR[task.status] + "22",
                color: STATUS_COLOR[task.status],
                border: `1px solid ${STATUS_COLOR[task.status]}44`,
                outline: "none",
              }}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            {statusChanging ? (
              <Loader2
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 animate-spin pointer-events-none"
                style={{ color: STATUS_COLOR[task.status] }}
              />
            ) : (
              <ChevronDown
                className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                style={{ color: STATUS_COLOR[task.status] }}
              />
            )}
          </div>
        </div>
      )}

      {/* Static status badge — all other columns */}
      {!showStatusSelect && !completedBy && (
        <div className="pl-4">
          <span
            className="text-[11px] px-2 py-0.5 rounded-full font-medium"
            style={{ background: STATUS_COLOR[task.status] + "22", color: STATUS_COLOR[task.status] }}
          >
            {STATUS_LABEL[task.status] ?? task.status}
          </span>
        </div>
      )}
    </div>
  );
}
