import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Get the projects this client has been assigned to (include name for heading)
  const clientProjects = await prisma.clientProject.findMany({
    where: { clientId: client.id },
    include: { project: { select: { id: true, name: true } } },
  });

  const assignedProjectIds = clientProjects.map((cp) => cp.projectId);
  const projectNames = clientProjects.map((cp) => cp.project.name);

  // If no projects assigned, return empty lists
  if (assignedProjectIds.length === 0) {
    return NextResponse.json({ myTasks: [], glenTasks: [], completedTasks: [], projectNames: [], noProjects: true });
  }

  // Fetch all tasks from assigned projects
  const allTasks = await prisma.task.findMany({
    where: { projectId: { in: assignedProjectIds } },
    include: { project: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  // Split into three groups.
  // myTasks: explicitly assigned to this client (clientId match) — always visible once assigned.
  // glenTasks: unassigned tasks that Glen has marked as client-visible.
  // completedTasks: all done tasks visible to this client.
  const myTasks = allTasks.filter((t) => t.clientId === client.id && t.status !== "done");
  const glenTasks = allTasks.filter((t) => t.clientId === null && t.status !== "done");
  const completedTasks = allTasks.filter((t) => t.status === "done");

  return NextResponse.json({ myTasks, glenTasks, completedTasks, projectNames, noProjects: false });
}
