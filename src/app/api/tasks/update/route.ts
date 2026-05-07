import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/tasks/update
 * Body: { task_id, status?, notes? }
 * Requires: Authorization: Bearer <INTERNAL_API_SECRET>
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { task_id, status, notes } = body || {};

  if (!task_id) {
    return NextResponse.json({ error: "task_id is required" }, { status: 400 });
  }

  const existing = await prisma.task.findUnique({ where: { id: Number(task_id) } });
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  const validStatuses = ["todo", "in_progress", "done"];
  if (status && !validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  if (status !== undefined) {
    updateData.status = status;
    if (status === "done" && !existing.completedAt) {
      updateData.completedAt = new Date();
    } else if (status !== "done") {
      updateData.completedAt = null;
    }
  }
  if (notes !== undefined) {
    updateData.notes = notes ? String(notes) : null;
  }

  const task = await prisma.task.update({
    where: { id: Number(task_id) },
    data: updateData,
    include: { project: true },
  });

  return NextResponse.json({ task });
}
