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
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      tasks: {
        select: {
          status: true,
          timeEntries: {
            select: { durationSeconds: true },
            where: { endedAt: { not: null } },
          },
        },
      },
    },
  });

  const result = projects.map((p) => {
    const totalSeconds = p.tasks.reduce(
      (sum, t) => sum + t.timeEntries.reduce((s, e) => s + (e.durationSeconds ?? 0), 0),
      0
    );
    return {
      id: p.id,
      name: p.name,
      color: p.color,
      clientName: p.clientName,
      notes: p.notes,
      taskCount: p.tasks.length,
      doneCount: p.tasks.filter((t) => t.status === "done").length,
      totalSeconds,
    };
  });

  return NextResponse.json({ projects: result });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { name, color, clientName, notes } = body || {};

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  // Place new project at the end
  const maxOrder = await prisma.project.aggregate({ _max: { sortOrder: true } });
  const nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const project = await prisma.project.create({
    data: {
      name: String(name),
      color: color ? String(color) : null,
      clientName: clientName ? String(clientName) : null,
      notes: notes ? String(notes) : null,
      sortOrder: nextOrder,
    },
  });

  return NextResponse.json({ project }, { status: 201 });
}
