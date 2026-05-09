import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/client-auth";

export const dynamic = "force-dynamic";

/** PATCH /api/tasks/[id]/assign — admin assigns task to a client */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { clientId, clientVisible } = await req.json();

  const task = await prisma.task.update({
    where: { id: Number(id) },
    data: {
      clientId: clientId || null,
      ...(clientVisible !== undefined ? { clientVisible } : {}),
    },
  });

  return NextResponse.json({ task });
}
