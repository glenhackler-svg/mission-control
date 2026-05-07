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
 * POST /api/tasks/create
 * Body: { project_id, title, notes?, due_date?, assignee? }
 * Requires: Authorization: Bearer <INTERNAL_API_SECRET>
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { project_id, title, notes, due_date, assignee } = body || {};

  if (!project_id || !title) {
    return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
  }

  // Verify project exists
  const project = await prisma.project.findUnique({ where: { id: Number(project_id) } });
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const task = await prisma.task.create({
    data: {
      projectId: Number(project_id),
      title: String(title),
      notes: notes ? String(notes) : null,
      dueDate: due_date ? new Date(due_date) : null,
      assignee: assignee ? String(assignee) : null,
      status: "todo",
    },
    include: { project: true },
  });

  return NextResponse.json({ task }, { status: 201 });
}
