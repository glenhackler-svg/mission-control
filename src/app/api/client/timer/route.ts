import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Scope to client's assigned projects only
  const clientProjects = await prisma.clientProject.findMany({
    where: { clientId: client.id },
    include: { project: { select: { id: true, name: true } } },
  });
  const assignedProjectIds = clientProjects.map((cp) => cp.projectId);
  const projectNames = clientProjects.map((cp) => cp.project.name);

  const entries = await prisma.timeEntry.findMany({
    where: { endedAt: { not: null }, task: { projectId: { in: assignedProjectIds } } },
    include: { task: { include: { project: true } } },
  });

  const totalSeconds = entries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const weekSeconds = entries
    .filter((e) => new Date(e.startedAt) >= startOfWeek)
    .reduce((s, e) => s + (e.durationSeconds ?? 0), 0);
  const monthSeconds = entries
    .filter((e) => new Date(e.startedAt) >= startOfMonth)
    .reduce((s, e) => s + (e.durationSeconds ?? 0), 0);

  // Per-task breakdown
  const byTaskMap = new Map<number, { taskId: number; taskTitle: string; projectName: string; totalSeconds: number }>();
  for (const entry of entries) {
    const key = entry.taskId;
    if (!byTaskMap.has(key)) {
      byTaskMap.set(key, {
        taskId: entry.taskId,
        taskTitle: entry.task.title,
        projectName: entry.task.project.name,
        totalSeconds: 0,
      });
    }
    byTaskMap.get(key)!.totalSeconds += entry.durationSeconds ?? 0;
  }
  const byTask = Array.from(byTaskMap.values())
    .filter((t) => t.totalSeconds > 0)
    .sort((a, b) => b.totalSeconds - a.totalSeconds);

  return NextResponse.json({ summary: { totalSeconds, weekSeconds, monthSeconds, byTask }, projectNames });
}
