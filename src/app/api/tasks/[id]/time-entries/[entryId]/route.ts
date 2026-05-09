import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/tasks/[id]/time-entries/[entryId]  -> delete a time entry
 * PATCH  /api/tasks/[id]/time-entries/[entryId]  -> edit duration/note on a time entry
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const entry = await prisma.timeEntry.findUnique({
    where: { id: Number(entryId) },
  });
  if (!entry || entry.taskId !== Number(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  await prisma.timeEntry.delete({ where: { id: Number(entryId) } });
  return NextResponse.json({ ok: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  const { id, entryId } = await params;
  const entry = await prisma.timeEntry.findUnique({
    where: { id: Number(entryId) },
  });
  if (!entry || entry.taskId !== Number(id)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const body = await req.json().catch(() => ({}));
  const { duration_seconds, note } = body || {};

  const updated = await prisma.timeEntry.update({
    where: { id: Number(entryId) },
    data: {
      ...(duration_seconds !== undefined && { durationSeconds: Number(duration_seconds) }),
      ...(note !== undefined && { note: note ? String(note) : null }),
    },
  });

  return NextResponse.json({ entry: updated });
}
