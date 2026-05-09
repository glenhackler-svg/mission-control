import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/tasks?project_id=1  -> list tasks for a project (no auth required for UI)
 * POST /api/tasks              -> create a task (no auth required for UI)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = Number(projectId);
  if (status) where.status = status;

  const tasks = await prisma.task.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { project_id, title, notes, due_date, assignee, client_id } = body || {};

  if (!project_id || !title) {
    return NextResponse.json({ error: "project_id and title are required" }, { status: 400 });
  }

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
      // When a client is chosen at creation time, make the task visible immediately
      ...(client_id ? { clientId: String(client_id), clientVisible: true } : {}),
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}
