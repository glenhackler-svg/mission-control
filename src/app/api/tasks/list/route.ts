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
 * GET /api/tasks/list?project_id=1&status=todo
 * Requires: Authorization: Bearer <INTERNAL_API_SECRET>
 * Returns tasks optionally filtered by project_id and/or status.
 */
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project_id");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = Number(projectId);
  if (status) where.status = status;

  const tasks = await prisma.task.findMany({
    where,
    include: { project: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tasks });
}
