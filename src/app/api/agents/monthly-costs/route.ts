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
 * GET  /api/agents/monthly-costs?year=2026   -> all rows for that year (defaults to current year)
 * POST /api/agents/monthly-costs             -> upsert a monthly snapshot
 *      body: { year, month, agentCost, delegationCost }
 *
 * POST /api/agents/monthly-costs  body: { action: "snapshot" }
 *      -> auto-computes and upserts the previous calendar month from live data
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

  const rows = await prisma.monthlyAgentCost.findMany({
    where: { year },
    orderBy: { month: "asc" },
  });

  return NextResponse.json({ year, rows });
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  // Auto-snapshot mode: compute previous month from live data
  if (body.action === "snapshot") {
    const now = new Date();
    // "previous month" relative to now
    const snapshotDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = snapshotDate.getFullYear();
    const month = snapshotDate.getMonth() + 1; // 1-based

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 1); // exclusive

    // Agent cost: sum of all totalCost as-of snapshot (cumulative per-agent)
    // For a true snapshot, we store the running total at snapshot time minus
    // whatever was stored last month. But since agents don't reset, we store
    // the point-in-time sum and let the dashboard show the raw row values.
    const agents = await prisma.agentState.findMany();
    const agentCost = agents.reduce((s, a) => s + a.totalCost, 0);

    // Delegation cost: only delegations created within that month
    const delegAgg = await prisma.taskDelegation.aggregate({
      _sum: { totalCost: true },
      where: { createdAt: { gte: monthStart, lt: monthEnd } },
    });
    const delegationCost = delegAgg._sum.totalCost ?? 0;
    const totalCost = agentCost + delegationCost;

    const row = await prisma.monthlyAgentCost.upsert({
      where: { year_month: { year, month } },
      create: { year, month, agentCost, delegationCost, totalCost },
      update: { agentCost, delegationCost, totalCost, snapshotAt: new Date() },
    });

    return NextResponse.json({ saved: row });
  }

  // Manual upsert mode
  const { year, month, agentCost, delegationCost } = body;
  if (!year || !month) {
    return NextResponse.json({ error: "year and month required" }, { status: 400 });
  }
  const ac = Number(agentCost ?? 0);
  const dc = Number(delegationCost ?? 0);

  const row = await prisma.monthlyAgentCost.upsert({
    where: { year_month: { year: Number(year), month: Number(month) } },
    create: {
      year: Number(year),
      month: Number(month),
      agentCost: ac,
      delegationCost: dc,
      totalCost: ac + dc,
    },
    update: {
      agentCost: ac,
      delegationCost: dc,
      totalCost: ac + dc,
      snapshotAt: new Date(),
    },
  });

  return NextResponse.json({ saved: row });
}
