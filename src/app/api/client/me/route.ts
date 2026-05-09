import { NextResponse } from "next/server";
import { getClientSession } from "@/lib/client-auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const client = await getClientSession();
  if (!client) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ client: { id: client.id, name: client.name, email: client.email } });
}
