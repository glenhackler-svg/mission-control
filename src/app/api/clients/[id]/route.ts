import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/client-auth";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, email, slug, password, projectIds } = body;

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (email !== undefined) updateData.email = email || null;
  if (slug !== undefined) updateData.slug = slug;
  if (password) {
    updateData.passwordHash = await bcrypt.hash(password, 12);
  }

  // Update project assignments if provided
  if (Array.isArray(projectIds)) {
    // Delete existing and recreate
    await prisma.clientProject.deleteMany({ where: { clientId: id } });
    updateData.projects = {
      create: projectIds.map((pid: number) => ({ projectId: pid })),
    };
  }

  const client = await prisma.client.update({
    where: { id },
    data: updateData,
    include: {
      projects: { include: { project: { select: { id: true, name: true, color: true } } } },
    },
  });

  return NextResponse.json({ client });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Unassign tasks before deleting client (cascade deletes ClientProject rows automatically)
  await prisma.task.updateMany({
    where: { clientId: id },
    data: { clientId: null },
  });

  await prisma.client.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
