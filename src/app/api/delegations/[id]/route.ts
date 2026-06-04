import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * GET /api/delegations/:id — get a single delegation with cost breakdown
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const delegation = await prisma.taskDelegation.findUnique({ where: { id } });
  if (!delegation) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ delegation });
}

/**
 * PATCH /api/delegations/:id — update costs and/or status
 * Body: { parentSessionCost?, childSessionCost?, status?, notes? }
 * Auth: INTERNAL_API_SECRET
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { parentSessionCost, childSessionCost, status, notes } = body || {};

  const existing = await prisma.taskDelegation.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newParent = Number.isFinite(parentSessionCost) ? Number(parentSessionCost) : existing.parentSessionCost;
  const newChild = Number.isFinite(childSessionCost) ? Number(childSessionCost) : existing.childSessionCost;

  const delegation = await prisma.taskDelegation.update({
    where: { id },
    data: {
      ...(Number.isFinite(parentSessionCost) && { parentSessionCost: newParent }),
      ...(Number.isFinite(childSessionCost) && { childSessionCost: newChild }),
      totalCost: newParent + newChild,
      ...(status !== undefined && { status: String(status) }),
      ...(notes !== undefined && { notes: notes ? String(notes) : null }),
    },
  });

  return NextResponse.json({ delegation });
}
