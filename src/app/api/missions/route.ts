import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Agent integration notes:
 *
 * When a mission step goes "active", agents can be notified via a cron job created by Claw.
 * The step `description` field becomes the agent's prompt.
 *
 * Agents complete a step by calling:
 *   POST /api/missions/{missionId}/steps/{stepId}/complete
 *   Authorization: Bearer {INTERNAL_API_SECRET}
 *   Content-Type: application/json
 *   {"result": "summary of what was done"}
 *
 * Or fail it:
 *   POST /api/missions/{missionId}/steps/{stepId}/fail
 *   {"error": "what went wrong"}
 */

function checkApiAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

async function checkSessionAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expected = process.env.DASHBOARD_SESSION_SECRET;
  return !!(expected && session === expected);
}

/**
 * GET /api/missions — return all missions with steps, step counts
 */
export async function GET() {
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      steps: {
        orderBy: { stepNumber: "asc" },
      },
    },
  });

  const result = missions.map((m) => ({
    ...m,
    totalSteps: m.steps.length,
    completedSteps: m.steps.filter((s) => s.status === "completed").length,
  }));

  return NextResponse.json({ missions: result });
}

/**
 * POST /api/missions — create a new mission with steps
 * Body: { title, description, priority, agentId, steps: [{title, description, agentId, stepNumber}] }
 * Auth: INTERNAL_API_SECRET or session cookie
 */
export async function POST(req: NextRequest) {
  const authed = checkApiAuth(req) || (await checkSessionAuth());
  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, priority, agentId, steps } = body || {};

  if (!title || !description || !agentId) {
    return NextResponse.json(
      { error: "title, description, and agentId are required" },
      { status: 400 }
    );
  }

  const stepsArray = Array.isArray(steps) ? steps : [];
  const now = new Date();
  const hasSteps = stepsArray.length > 0;

  const mission = await prisma.mission.create({
    data: {
      title: String(title),
      description: String(description),
      priority: priority ? String(priority) : "medium",
      agentId: String(agentId),
      status: hasSteps ? "active" : "pending",
      startedAt: hasSteps ? now : null,
      currentStep: hasSteps ? 1 : 0,
      steps: hasSteps
        ? {
            create: stepsArray.map((s: { title: string; description: string; agentId: string; stepNumber: number }, idx: number) => ({
              stepNumber: s.stepNumber ?? idx + 1,
              title: String(s.title),
              description: String(s.description),
              agentId: String(s.agentId),
              status: (s.stepNumber ?? idx + 1) === 1 ? "active" : "pending",
              startedAt: (s.stepNumber ?? idx + 1) === 1 ? now : null,
            })),
          }
        : undefined,
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json({ mission }, { status: 201 });
}
