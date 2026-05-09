import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const SECRET = () => process.env.DASHBOARD_SESSION_SECRET!;

/** Sign a clientId into a cookie value: "clientId.signature" */
export function signClientId(clientId: string): string {
  const sig = createHmac("sha256", SECRET()).update(clientId).digest("hex");
  return `${clientId}.${sig}`;
}

/** Verify and extract clientId from signed cookie value. Returns null if invalid. */
export function verifyClientCookie(value: string): string | null {
  const dotIndex = value.lastIndexOf(".");
  if (dotIndex === -1) return null;
  const clientId = value.substring(0, dotIndex);
  const sig = value.substring(dotIndex + 1);
  const expected = createHmac("sha256", SECRET()).update(clientId).digest("hex");
  // Constant-time comparison to avoid timing attacks
  if (sig.length !== expected.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) {
    diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0 ? clientId : null;
}

/** Read current client session from cookies. Returns client or null. */
export async function getClientSession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("mc_client_session")?.value;
  if (!raw) return null;
  const clientId = verifyClientCookie(raw);
  if (!clientId) return null;
  const client = await prisma.client.findUnique({ where: { id: clientId } });
  return client;
}

/** Check if the current request is an admin (mc_session cookie). */
export async function isAdminSession(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get("mc_session")?.value;
  const expected = process.env.DASHBOARD_SESSION_SECRET;
  return !!(expected && session === expected);
}
