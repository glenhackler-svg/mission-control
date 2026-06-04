import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createHmac, timingSafeEqual } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/calendly-webhook
 *
 * Receives Calendly `invitee.created` webhooks and marks matching leads as booked.
 * No session auth required — this is called by Calendly's servers.
 * If CALENDLY_WEBHOOK_SECRET is set, the Calendly-Webhook-Signature header is verified.
 * Always returns 200 so Calendly doesn't retry.
 */

function verifySignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  // Calendly signature header format: "t=<timestamp>,v1=<hmac>"
  const parts = Object.fromEntries(
    header.split(",").map((p) => p.split("=") as [string, string])
  );

  const timestamp = parts["t"];
  const signature = parts["v1"];

  if (!timestamp || !signature) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = createHmac("sha256", secret).update(signedPayload).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await req.text();

  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (secret) {
    const sigHeader = req.headers.get("Calendly-Webhook-Signature");
    if (!verifySignature(rawBody, sigHeader, secret)) {
      console.warn("[calendly-webhook] Signature verification failed");
      // Still return 200 to avoid Calendly retries, but don't process
      return NextResponse.json({ matched: false, error: "invalid_signature" }, { status: 200 });
    }
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ matched: false, error: "invalid_json" }, { status: 200 });
  }

  // Only process invitee.created events
  if (body.event !== "invitee.created") {
    return NextResponse.json({ matched: false, skipped: true, event: body.event }, { status: 200 });
  }

  // Extract email — Calendly sends it at payload.email
  const payload = body.payload as Record<string, unknown> | undefined;
  const email =
    (payload?.email as string | undefined) ||
    ((payload?.event as Record<string, unknown> | undefined)?.invitee as Record<string, unknown> | undefined)?.email as string | undefined;

  if (!email) {
    console.warn("[calendly-webhook] No email found in payload", JSON.stringify(body));
    return NextResponse.json({ matched: false, error: "no_email" }, { status: 200 });
  }

  // Look up lead by email (case-insensitive)
  const lead = await prisma.lead.findFirst({
    where: {
      email: {
        equals: email.toLowerCase(),
        mode: "insensitive",
      },
    },
    orderBy: { sentAt: "desc" }, // prefer most-recent if multiple
  });

  if (!lead) {
    console.log(`[calendly-webhook] No lead found for email: ${email}`);
    return NextResponse.json({ matched: false }, { status: 200 });
  }

  // Mark as booked
  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      booked: true,
      bookedAt: new Date(),
    },
  });

  console.log(`[calendly-webhook] Marked lead ${lead.id} (${email}) as booked`);
  return NextResponse.json({ matched: true, leadId: lead.id }, { status: 200 });
}
