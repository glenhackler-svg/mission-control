import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/leads/:id/notes  -> update lead notes (dashboard session auth)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Accept either dashboard session cookie OR bearer token
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expectedSession = process.env.DASHBOARD_SESSION_SECRET;
  const auth = req.headers.get("authorization") || "";
  const expectedBearer = `Bearer ${process.env.INTERNAL_API_SECRET}`;

  const authed =
    (expectedSession && session === expectedSession) ||
    (process.env.INTERNAL_API_SECRET && auth === expectedBearer);

  if (!authed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { notes } = body || {};

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data: { notes: notes !== undefined ? String(notes) : null },
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
