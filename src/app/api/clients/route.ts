import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { isAdminSession } from "@/lib/client-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clients = await prisma.client.findMany({
    include: {
      _count: { select: { tasks: true } },
      projects: { include: { project: { select: { id: true, name: true, color: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ clients });
}

export async function POST(req: NextRequest) {
  if (!(await isAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, email, slug, password, projectIds } = body;
  if (!name || !slug || !password) {
    return NextResponse.json({ error: "name, slug, and password are required" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const client = await prisma.client.create({
    data: {
      name,
      email: email || null,
      slug,
      passwordHash,
      projects: {
        create: Array.isArray(projectIds)
          ? projectIds.map((pid: number) => ({ projectId: pid }))
          : [],
      },
    },
    include: {
      projects: { include: { project: { select: { id: true, name: true, color: true } } } },
    },
  });

  // Send invite email if client has an email address
  if (email && process.env.AGENTMAIL_API_KEY && process.env.AGENTMAIL_FROM_INBOX) {
    const projectNames = client.projects.map((p) => p.project.name).join(", ");
    const dashboardUrl = "https://mcdashboard.xenlerconsulting.com";
    const html = `
      <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; color: #111;">
        <h2 style="margin-bottom: 4px;">You're invited to Mission Control</h2>
        <p style="color: #555; margin-top: 0;">Glen Hackler · Xenler Consulting</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p>Hi ${name},</p>
        <p>I've set up a project dashboard where you can track progress, see task status, and stay up to date on everything we're working on together${projectNames ? " for <strong>" + projectNames + "</strong>" : ""}.</p>
        <p><strong>Dashboard:</strong> <a href="${dashboardUrl}">${dashboardUrl}</a></p>
        <p><strong>Password:</strong> <code style="background:#f4f4f4;padding:2px 6px;border-radius:4px;">${password}</code></p>
        <p style="color:#888;font-size:13px;">You can change your password by contacting Glen directly.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 13px; color: #888;">Glen Hackler &mdash; Xenler Consulting<br/><a href="https://xenlerconsulting.com">xenlerconsulting.com</a></p>
      </div>
    `;

    await fetch(`https://api.agentmail.to/v0/inboxes/${encodeURIComponent(process.env.AGENTMAIL_FROM_INBOX)}/messages/send`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.AGENTMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: [email],
        subject: `You're invited to Mission Control — Xenler Consulting`,
        html,
      }),
    }).catch((err) => console.error("Invite email failed:", err));
  }

  return NextResponse.json({ client }, { status: 201 });
}
