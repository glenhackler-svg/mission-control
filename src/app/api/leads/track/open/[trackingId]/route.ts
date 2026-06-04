import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 1x1 transparent GIF (base64)
const TRANSPARENT_GIF_B64 =
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * GET /api/leads/track/open/:trackingId
 * Open tracking pixel endpoint.
 * Marks the lead as opened (first time only) and returns a 1x1 transparent GIF.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  try {
    const lead = await prisma.lead.findUnique({ where: { openTrackingId: trackingId } });
    if (lead && !lead.opened) {
      await prisma.lead.update({
        where: { openTrackingId: trackingId },
        data: { opened: true, openedAt: new Date() },
      });
    }
  } catch {
    // best-effort — still return the pixel
  }

  const gifBuffer = Buffer.from(TRANSPARENT_GIF_B64, "base64");
  return new NextResponse(gifBuffer, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  });
}
