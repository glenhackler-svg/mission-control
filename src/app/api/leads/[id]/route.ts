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
 * PATCH /api/leads/:id  -> update a lead (manual status overrides, notes, etc.)
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const allowedFields = [
    "batchId", "company", "contactName", "email", "website",
    "opportunityScore", "city", "subject", "opened", "openedAt",
    "unsubscribed", "unsubscribedAt", "booked", "bookedAt", "notes",
  ];

  const data: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field];
  }

  try {
    const lead = await prisma.lead.update({
      where: { id: Number(id) },
      data,
    });
    return NextResponse.json({ lead });
  } catch {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }
}
