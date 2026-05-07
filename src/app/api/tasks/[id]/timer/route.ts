import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/[id]/timer
 * Body: { action: "start" | "stop", note? }
 *
 * start: creates a new open TimeEntry (endedAt=null)
 * stop:  closes the latest open TimeEntry, computes duration
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  const body = await req.json().catch(() => ({}));
  const { action, note } = body || {};

  if (action !== "start" && action !== "stop") {
    return NextResponse.json({ error: "action must be 'start' or 'stop'" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  if (action === "start") {
    // Check for an already-running entry
    const running = await prisma.timeEntry.findFirst({
      where: { taskId, endedAt: null },
    });
    if (running) {
      return NextResponse.json({ error: "Timer already running", entry: running }, { status: 409 });
    }

    const entry = await prisma.timeEntry.create({
      data: { taskId, startedAt: new Date(), note: note ? String(note) : null },
    });

    // Automatically set task to in_progress if it's todo
    if (task.status === "todo") {
      await prisma.task.update({ where: { id: taskId }, data: { status: "in_progress" } });
    }

    return NextResponse.json({ entry }, { status: 201 });
  }

  // action === "stop"
  const running = await prisma.timeEntry.findFirst({
    where: { taskId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!running) {
    return NextResponse.json({ error: "No timer running for this task" }, { status: 404 });
  }

  const endedAt = new Date();
  const durationSeconds = Math.round((endedAt.getTime() - running.startedAt.getTime()) / 1000);

  const entry = await prisma.timeEntry.update({
    where: { id: running.id },
    data: {
      endedAt,
      durationSeconds,
      ...(note !== undefined && { note: note ? String(note) : null }),
    },
  });

  return NextResponse.json({ entry });
}
