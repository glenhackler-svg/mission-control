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
 * GET  /api/ideas          -> list all ideas (latest first)
 * POST /api/ideas          -> create a new idea (requires Bearer auth)
 *
 * POST body:
 *   title       string  (required)
 *   description string  (optional)
 *   category    string  (optional) e.g. "business", "tech", "personal"
 *   source      string  (optional) defaults to "einstein"
 *   status      string  (optional) defaults to "pending"
 */

export async function GET() {
  const ideas = await prisma.idea.findMany({
    orderBy: [{ sortOrder: "asc" }, { timestamp: "desc" }],
    take: 200,
  });
  return NextResponse.json({ ideas });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, category, source, status } = body || {};

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const idea = await prisma.idea.create({
    data: {
      title: String(title),
      description: description ? String(description) : null,
      category: category ? String(category) : null,
      source: source ? String(source) : "einstein",
      status: status ? String(status) : "pending",
    },
  });

  return NextResponse.json({ idea }, { status: 201 });
}
