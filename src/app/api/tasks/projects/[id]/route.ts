import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PUT  /api/tasks/projects/[id]  -> update project
 * DELETE /api/tasks/projects/[id] -> archive project
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, color, clientName, notes } = body || {};

  const project = await prisma.project.update({
    where: { id: Number(id) },
    data: {
      ...(name !== undefined && { name: String(name) }),
      ...(color !== undefined && { color: String(color) }),
      ...(clientName !== undefined && { clientName: clientName ? String(clientName) : null }),
      ...(notes !== undefined && { notes: notes ? String(notes) : null }),
    },
  });

  return NextResponse.json({ project });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.project.update({
    where: { id: Number(id) },
    data: { archived: true },
  });
  return NextResponse.json({ ok: true });
}
