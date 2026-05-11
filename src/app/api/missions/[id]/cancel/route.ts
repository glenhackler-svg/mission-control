import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function checkSessionAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expected = process.env.DASHBOARD_SESSION_SECRET;
  return !!(expected && session === expected);
}

/**
 * POST /api/missions/[id]/cancel
 * Auth: session cookie
 * Sets mission status = "cancelled", all pending/active steps → "skipped"
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkSessionAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["pending", "active"].includes(mission.status)) {
    return NextResponse.json(
      { error: `Cannot cancel mission with status: ${mission.status}` },
      { status: 400 }
    );
  }

  // Cancel all pending/active steps
  await prisma.missionStep.updateMany({
    where: {
      missionId: id,
      status: { in: ["pending", "active"] },
    },
    data: { status: "skipped" },
  });

  const updated = await prisma.mission.update({
    where: { id },
    data: {
      status: "cancelled",
      completedAt: new Date(),
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json({ mission: updated });
}
