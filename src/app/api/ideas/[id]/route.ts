import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/ideas/[id]
 * Update title, description, category, status, sortOrder
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, description, category, status, sortOrder } = body || {};

  const data: Record<string, unknown> = {};
  if (title !== undefined) data.title = String(title);
  if (description !== undefined) data.description = description ? String(description) : null;
  if (category !== undefined) data.category = category ? String(category) : null;
  if (status !== undefined) data.status = String(status);
  if (sortOrder !== undefined) data.sortOrder = Number(sortOrder);

  const idea = await prisma.idea.update({ where: { id }, data });
  return NextResponse.json({ idea });
}

/**
 * DELETE /api/ideas/[id]
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.idea.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
