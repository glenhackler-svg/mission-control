import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signClientId } from "@/lib/client-auth";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  // 1. Check admin password first
  if (password === process.env.DASHBOARD_PASSWORD) {
    const session = process.env.DASHBOARD_SESSION_SECRET!;
    const res = NextResponse.json({ ok: true, role: "admin" });
    res.cookies.set("mc_session", session, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  // 2. Check client passwords
  const clients = await prisma.client.findMany();
  for (const client of clients) {
    const match = await bcrypt.compare(password, client.passwordHash);
    if (match) {
      const signed = signClientId(client.id);
      const res = NextResponse.json({ ok: true, role: "client" });
      res.cookies.set("mc_client_session", signed, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
      return res;
    }
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
