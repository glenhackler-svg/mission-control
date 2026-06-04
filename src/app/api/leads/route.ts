import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.INTERNAL_API_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") || "";
  return auth === `Bearer ${secret}`;
}

/**
 * GET  /api/leads           -> list all leads (optional ?batchId= filter)
 * POST /api/leads           -> log a sent email (called by Scout after each send)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const batchId = searchParams.get("batchId");

  const leads = await prisma.lead.findMany({
    where: batchId ? { batchId } : undefined,
    orderBy: { sentAt: "desc" },
  });
  return NextResponse.json({ leads });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { batchId, company, contactName, email, website, opportunityScore, city, subject } = body || {};

  if (!batchId || !company || !email || !subject) {
    return NextResponse.json(
      { error: "batchId, company, email, and subject are required" },
      { status: 400 }
    );
  }

  const lead = await prisma.lead.create({
    data: {
      batchId: String(batchId),
      company: String(company),
      contactName: contactName ? String(contactName) : null,
      email: String(email),
      website: website ? String(website) : null,
      opportunityScore: Number.isFinite(opportunityScore) ? Number(opportunityScore) : 5,
      city: city ? String(city) : null,
      subject: String(subject),
      sentAt: new Date(),
      openTrackingId: randomUUID(),
    },
  });

  return NextResponse.json({ lead }, { status: 201 });
}
