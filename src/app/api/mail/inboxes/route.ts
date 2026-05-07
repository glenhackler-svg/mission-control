import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

export async function GET() {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AgentMail API key not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(`${AGENTMAIL_BASE}/inboxes`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `AgentMail error: ${text}` }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
