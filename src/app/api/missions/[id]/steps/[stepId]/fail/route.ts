import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function checkApiAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * POST /api/missions/[id]/steps/[stepId]/fail
 * Auth: INTERNAL_API_SECRET
 * Body: { error: string }
 *
 * - Marks step as failed
 * - Sets mission status to "failed"
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  if (!checkApiAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, stepId } = await params;
  const body = await req.json().catch(() => ({}));
  const errorDetail = body?.error ? String(body.error) : "Unknown error";
  const now = new Date();

  // Fetch the step
  const step = await prisma.missionStep.findUnique({
    where: { id: stepId },
  });

  if (!step || step.missionId !== id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  // Mark step as failed
  await prisma.missionStep.update({
    where: { id: stepId },
    data: {
      status: "failed",
      completedAt: now,
      errorDetail,
    },
  });

  // Fail the mission
  const updated = await prisma.mission.update({
    where: { id },
    data: {
      status: "failed",
      completedAt: now,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json({ mission: updated });
}
