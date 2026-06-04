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
 * GET /api/delegations — list all delegations, newest first (paginated)
 * Query params: page (default 1), limit (default 50)
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
  const skip = (page - 1) * limit;

  const [delegations, total] = await Promise.all([
    prisma.taskDelegation.findMany({
      orderBy: { delegatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.taskDelegation.count(),
  ]);

  return NextResponse.json({ delegations, total, page, limit });
}

/**
 * POST /api/delegations — create a new delegation record
 * Body: { id?, title, parentAgentId, childAgentId, notes? }
 * Auth: INTERNAL_API_SECRET
 */
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { id, title, parentAgentId, childAgentId, notes } = body || {};

  if (!title || !parentAgentId || !childAgentId) {
    return NextResponse.json(
      { error: "title, parentAgentId, and childAgentId are required" },
      { status: 400 }
    );
  }

  const delegation = await prisma.taskDelegation.create({
    data: {
      ...(id ? { id: String(id) } : {}),
      title: String(title),
      parentAgentId: String(parentAgentId),
      childAgentId: String(childAgentId),
      notes: notes ? String(notes) : null,
      status: "in_progress",
    },
  });

  return NextResponse.json({ delegation }, { status: 201 });
}
