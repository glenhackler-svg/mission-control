import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/tasks/projects/reorder
 * Body: { orderedIds: number[] }  — full ordered list of project IDs
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { orderedIds } = body || {};

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return NextResponse.json({ error: "orderedIds required" }, { status: 400 });
  }

  await Promise.all(
    orderedIds.map((id: number, index: number) =>
      prisma.project.update({ where: { id }, data: { sortOrder: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
