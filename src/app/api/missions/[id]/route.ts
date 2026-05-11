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
 * GET /api/missions/[id] — return mission with all steps ordered by stepNumber
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const mission = await prisma.mission.findUnique({
    where: { id },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!mission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ mission });
}

/**
 * PATCH /api/missions/[id] — update mission fields
 * Body: { title?, description?, priority?, status? }
 * Auth: session cookie
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkSessionAuth())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { title, description, priority, status } = body || {};

  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.mission.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: String(title) }),
      ...(description !== undefined && { description: String(description) }),
      ...(priority !== undefined && { priority: String(priority) }),
      ...(status !== undefined && { status: String(status) }),
    },
    include: {
      steps: { orderBy: { stepNumber: "asc" } },
    },
  });

  return NextResponse.json({ mission: updated });
}
