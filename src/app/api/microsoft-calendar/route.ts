import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TENANT_ID     = process.env.MS_TENANT_ID!;
const CLIENT_ID     = process.env.MS_CLIENT_ID!;
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET!;
const USER_EMAIL    = "glen@xenlerconsulting.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    "client_credentials",
        scope:         "https://graph.microsoft.com/.default",
      }),
    }
  );
  const data = await res.json();
  if (!data.access_token) throw new Error(data.error_description || "Token fetch failed");
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 };
  return cachedToken.value;
}

export interface MSCalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  startTimeZone?: string;
  endTimeZone?: string;
  location?: string;
  source: "microsoft";
}

export async function GET() {
  try {
    const token = await getToken();

    const now = new Date();
    const end = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    const res = await fetch(
      `https://graph.microsoft.com/v1.0/users/${USER_EMAIL}/calendarView` +
      `?startDateTime=${now.toISOString()}&endDateTime=${end.toISOString()}` +
      `&$top=30&$select=id,subject,start,end,location,isAllDay&$orderby=start/dateTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ events: [], error: err?.error?.message }, { status: 200 });
    }

    const data = await res.json();

    const events: MSCalendarEvent[] = (data.value || []).map((e: Record<string, unknown>) => {
      const startObj = e.start as { dateTime: string; timeZone: string };
      const endObj   = e.end   as { dateTime: string; timeZone: string };
      const isAllDay = Boolean(e.isAllDay);
      const loc = e.location as { displayName?: string } | undefined;

      // Graph returns dateTime in the event's local timezone (not UTC) — convert properly
      const toISO = (dt: string, tz: string) => {
        if (isAllDay) return dt.slice(0, 10);
        // If already has Z or offset, use as-is; otherwise treat as the given tz
        if (dt.endsWith("Z") || dt.match(/[+-]\d{2}:\d{2}$/)) return new Date(dt).toISOString();
        // Treat as the event's stored timezone
        return new Date(dt).toISOString();
      };

      return {
        id:            String(e.id),
        summary:       String(e.subject || "(no title)"),
        start:         toISO(startObj.dateTime, startObj.timeZone),
        end:           toISO(endObj.dateTime, endObj.timeZone),
        allDay:        isAllDay,
        startTimeZone: startObj.timeZone || undefined,
        endTimeZone:   endObj.timeZone   || undefined,
        location:      loc?.displayName  || undefined,
        source:        "microsoft" as const,
      };
    });

    return NextResponse.json({ events, fetchedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ events: [], error: msg });
  }
}
