import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET    /api/tasks/[id]  -> get task with time entries
 * PUT    /api/tasks/[id]  -> update task fields
 * DELETE /api/tasks/[id]  -> delete task
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const task = await prisma.task.findUnique({
    where: { id: Number(id) },
    include: {
      timeEntries: { orderBy: { startedAt: "desc" } },
      project: true,
    },
  });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ task });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, notes, status, dueDate, assignee } = body || {};

  const existing = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = String(title);
  if (notes !== undefined) updateData.notes = notes ? String(notes) : null;
  if (assignee !== undefined) updateData.assignee = assignee ? String(assignee) : null;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (status !== undefined) {
    updateData.status = status;
    if (status === "done" && !existing.completedAt) {
      updateData.completedAt = new Date();
    } else if (status !== "done") {
      updateData.completedAt = null;
    }
  }

  const task = await prisma.task.update({
    where: { id: Number(id) },
    data: updateData,
    include: { timeEntries: { orderBy: { startedAt: "desc" } }, project: true },
  });

  return NextResponse.json({ task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.timeEntry.deleteMany({ where: { taskId: Number(id) } });
  await prisma.task.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
