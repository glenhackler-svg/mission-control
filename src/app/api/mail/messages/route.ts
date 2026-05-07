import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

export async function GET(req: NextRequest) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AgentMail API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const inboxId = searchParams.get("inbox_id");
  const limit = searchParams.get("limit") ?? "50";

  if (!inboxId) {
    return NextResponse.json({ error: "inbox_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${AGENTMAIL_BASE}/inboxes/${encodeURIComponent(inboxId)}/messages?limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

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
