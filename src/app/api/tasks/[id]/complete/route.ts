import { NextRequest, NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/tasks/[id]/complete — client updates status on their own task.
 * Body: { status?: "todo" | "in_progress" | "done" }  (defaults to "done")
 * Security: task.clientId must match the authenticated client.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const status: string = body?.status ?? "done";

  const validStatuses = ["todo", "in_progress", "done"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: `status must be one of: ${validStatuses.join(", ")}` }, { status: 400 });
  }

  const task = await prisma.task.findUnique({ where: { id: Number(id) } });
  if (!task) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Security: only allow updating tasks explicitly assigned to this client
  if (task.clientId !== client.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.task.update({
    where: { id: Number(id) },
    data: {
      status,
      completedAt: status === "done" ? (task.completedAt ?? new Date()) : null,
    },
  });

  return NextResponse.json({ task: updated });
}
