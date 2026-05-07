import { execSync } from "child_process";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;       // ISO datetime or date string
  end: string;
  allDay: boolean;
  startTimeZone?: string;
  endTimeZone?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
}

function parseDate(obj: { dateTime?: string; date?: string }): { iso: string; allDay: boolean } {
  if (obj.dateTime) return { iso: obj.dateTime, allDay: false };
  if (obj.date) return { iso: obj.date, allDay: true };
  return { iso: new Date().toISOString(), allDay: false };
}

export async function GET() {
  try {
    const raw = execSync(
      "gog cal list -a xenlerconsulting@gmail.com -j --results-only --days=14 --max=20",
      { encoding: "utf8", timeout: 15000 }
    );

    const items: Record<string, unknown>[] = JSON.parse(raw);

    const events: CalendarEvent[] = items
      .filter((e) => e.status !== "cancelled")
      .map((e) => {
        const startObj = (e.start || {}) as { dateTime?: string; date?: string };
        const endObj   = (e.end   || {}) as { dateTime?: string; date?: string };
        const { iso: startIso, allDay } = parseDate(startObj);
        const { iso: endIso }           = parseDate(endObj);

        return {
          id:            String(e.id),
          summary:       String(e.summary || "(no title)"),
          start:         startIso,
          end:           endIso,
          allDay,
          startTimeZone: startObj.timeZone ? String(startObj.timeZone) : undefined,
          endTimeZone:   endObj.timeZone   ? String(endObj.timeZone)   : undefined,
          location:      e.location    ? String(e.location)    : undefined,
          description:   e.description ? String(e.description) : undefined,
          htmlLink:      e.htmlLink    ? String(e.htmlLink)    : undefined,
        };
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

    return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Failed to fetch calendar", detail: msg }, { status: 500 });
  }
}
