import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/client-auth";

const INTERNAL_API_SECRET = process.env.INTERNAL_API_SECRET ?? "";
const AGENTMAIL_API_KEY = process.env.AGENTMAIL_API_KEY ?? "";
const INBOX = process.env.AGENTMAIL_INBOX ?? "xenlerconsulting@glenhackler.com";

export async function POST(req: NextRequest) {
  // Auth: accept Bearer token (cron/external callers) OR admin session cookie (dashboard)
  const auth = req.headers.get("Authorization");
  const bearerOk = !!INTERNAL_API_SECRET && auth === `Bearer ${INTERNAL_API_SECRET}`;
  const sessionOk = await isAdminSession();
  if (!bearerOk && !sessionOk) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch recent messages from AgentMail inbox
  const messagesRes = await fetch(
    `https://api.agentmail.to/v0/inboxes/${INBOX}/messages?limit=50`,
    {
      headers: {
        Authorization: `Bearer ${AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!messagesRes.ok) {
    const errText = await messagesRes.text();
    return NextResponse.json(
      { error: "Failed to fetch messages from AgentMail", detail: errText },
      { status: 502 }
    );
  }

  const messagesData = await messagesRes.json();
  const messages: Array<{
    id: string;
    subject?: string;
    from?: string;
    preview?: string;
  }> = messagesData.messages ?? messagesData ?? [];

  // Filter for bounce/DSN messages
  const bounceMessages = messages.filter((m) => {
    const subject = (m.subject ?? "").toLowerCase();
    const from = (m.from ?? "").toLowerCase();
    return (
      subject.includes("delivery status notification") &&
      from.includes("mailer-daemon")
    );
  });

  const newBounces: Array<{ id: number; email: string; company: string }> = [];

  for (const msg of bounceMessages) {
    const preview = msg.preview ?? "";

    // Extract bounced email address from preview
    // Format: "the following recipients:\n<email>"
    const match = preview.match(
      /the following recipients?:\s*\n\s*([^\s@]+@[^\s]+)/i
    );
    if (!match) continue;

    const bouncedEmail = match[1].trim().replace(/[.,;>]$/, "");

    // Look up lead by email
    const lead = await prisma.lead.findFirst({
      where: { email: bouncedEmail },
    });

    if (!lead || lead.bounced) continue;

    // Mark as bounced
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        bounced: true,
        bouncedAt: new Date(),
      },
    });

    newBounces.push({ id: lead.id, email: lead.email, company: lead.company });
  }

  return NextResponse.json({
    checked: bounceMessages.length,
    newBounces: newBounces.length,
    leads: newBounces,
  });
}
