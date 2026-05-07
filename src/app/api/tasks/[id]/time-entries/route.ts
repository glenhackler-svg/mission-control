import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET  /api/tasks/[id]/time-entries  -> list all time entries for a task
 * POST /api/tasks/[id]/time-entries  -> manual time entry
 *   Body: { started_at, ended_at, duration_seconds?, note? }
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const entries = await prisma.timeEntry.findMany({
    where: { taskId: Number(id) },
    orderBy: { startedAt: "desc" },
  });
  return NextResponse.json({ entries });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const taskId = Number(id);
  const body = await req.json().catch(() => ({}));
  const { started_at, ended_at, duration_seconds, note } = body || {};

  if (!started_at) {
    return NextResponse.json({ error: "started_at is required" }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

  const startedAt = new Date(started_at);
  const endedAt = ended_at ? new Date(ended_at) : null;
  const dur = duration_seconds
    ? Number(duration_seconds)
    : endedAt
    ? Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
    : null;

  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      startedAt,
      endedAt,
      durationSeconds: dur,
      note: note ? String(note) : null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
