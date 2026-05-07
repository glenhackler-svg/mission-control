import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const AGENTMAIL_BASE = "https://api.agentmail.to/v0";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AgentMail API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const inboxId = searchParams.get("inbox_id");
  const { id: messageId } = await params;

  if (!inboxId) {
    return NextResponse.json({ error: "inbox_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${AGENTMAIL_BASE}/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const apiKey = process.env.AGENTMAIL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AgentMail API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const inboxId = searchParams.get("inbox_id");
  const { id: messageId } = await params;

  if (!inboxId) {
    return NextResponse.json({ error: "inbox_id is required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${AGENTMAIL_BASE}/inboxes/${encodeURIComponent(inboxId)}/messages/${encodeURIComponent(messageId)}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      }
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: `AgentMail error: ${text}` }, { status: res.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
