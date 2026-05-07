import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET  /api/tasks/projects  -> list all projects with task counts
 * POST /api/tasks/projects  -> create a new project
 */
export async function GET() {
  const projects = await prisma.project.findMany({
    where: { archived: false },
    orderBy: { createdAt: "asc" },
    include: {
      tasks: {
        select: { status: true },
      },
    },
  });

  const result = projects.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    clientName: p.clientName,
    notes: p.notes,
    taskCount: p.tasks.length,
    doneCount: p.tasks.filter((t) => t.status === "done").length,
  }));

  return NextResponse.json({ projects: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, color, clientName, notes } = body || {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const project = await prisma.project.create({
    data: {
      name: String(name),
      color: color ? String(color) : null,
      clientName: clientName ? String(clientName) : null,
      notes: notes ? String(notes) : null,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
