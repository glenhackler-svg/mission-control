import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

export async function POST(req: NextRequest) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AgentMail API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { inbox_id, to, subject, text, html } = body || {};

    if (!inbox_id || !to || !subject) {
      return NextResponse.json({ error: "inbox_id, to, and subject are required" }, { status: 400 });
    }

    const res = await fetch(
      `${AGENTMAIL_BASE}/inboxes/${encodeURIComponent(inbox_id)}/messages/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, subject, text, html }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `AgentMail error: ${errText}` }, { status: res.status });
    }

    const data = await res.json().catch(() => ({ success: true }));
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
