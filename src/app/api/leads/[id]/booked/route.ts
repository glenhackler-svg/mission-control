import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

async function checkAuth(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expectedSession = process.env.DASHBOARD_SESSION_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expectedBearer = `Bearer ${process.env.INTERNAL_API_SECRET}`;
  return (
    (!!expectedSession && session === expectedSession) ||
    (!!process.env.INTERNAL_API_SECRET && auth === expectedBearer)
  );
}

/**
 * POST   /api/leads/:id/booked  -> mark a lead as booked
 * DELETE /api/leads/:id/booked  -> unmark booked
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: { booked: true, bookedAt: new Date() },
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: { booked: false, bookedAt: null },
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
