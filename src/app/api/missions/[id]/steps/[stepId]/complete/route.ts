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
 * POST /api/missions/[id]/steps/[stepId]/complete
 * Auth: INTERNAL_API_SECRET
 * Body: { result: string }
 *
 * - Marks step completed
 * - Advances to next step, or completes the mission if this was the last step
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
  const result = body?.result ? String(body.result) : null;
  const now = new Date();

  // Fetch the step
  const step = await prisma.missionStep.findUnique({
    where: { id: stepId },
    include: { mission: true },
  });

  if (!step || step.missionId !== id) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  if (step.status !== "active") {
    return NextResponse.json(
      { error: `Step is not active (current status: ${step.status})` },
      { status: 400 }
    );
  }

  // Mark this step completed
  await prisma.missionStep.update({
    where: { id: stepId },
    data: {
      status: "completed",
      completedAt: now,
      result,
    },
  });

  // Find next step
  const nextStep = await prisma.missionStep.findFirst({
    where: {
      missionId: id,
      stepNumber: step.stepNumber + 1,
    },
  });

  let missionUpdate: Record<string, unknown>;

  if (nextStep) {
    // Activate next step
    await prisma.missionStep.update({
      where: { id: nextStep.id },
      data: {
        status: "active",
        startedAt: now,
      },
    });
    missionUpdate = {
      currentStep: nextStep.stepNumber,
    };
  } else {
    // This was the last step — complete the mission
    missionUpdate = {
      status: "completed",
      completedAt: now,
      result,
    };
  }

  const updated = await prisma.mission.update({
    where: { id },
    data: missionUpdate,
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json({ mission: updated });
}
