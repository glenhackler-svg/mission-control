import { prisma } from "@/lib/prisma";
import { MarketingClient } from "./marketing-client";

export const dynamic = "force-dynamic";

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string }>;
}) {
  const { batchId } = await searchParams;

  // Get all distinct batch IDs for the filter dropdown
  const batches = await prisma.lead.findMany({
    select: { batchId: true },
    distinct: ["batchId"],
    orderBy: { sentAt: "desc" },
  });
  const batchIds = batches.map((b) => b.batchId);

  // Fetch leads (filtered or all)
  const leads = await prisma.lead.findMany({
    where: batchId ? { batchId } : undefined,
    orderBy: { sentAt: "desc" },
  });

  return (
    <MarketingClient
      leads={leads}
      batchIds={batchIds}
      activeBatchId={batchId || null}
    />
  );
}
