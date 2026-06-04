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
 * POST /api/leads/:id/unsubscribed  -> mark a lead as unsubscribed
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: { unsubscribed: true, unsubscribedAt: new Date() },
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
