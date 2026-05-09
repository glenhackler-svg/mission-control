"use client";

import { useEffect, useState } from "react";

interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  allDay: boolean;
  startTimeZone?: string;
  endTimeZone?: string;
  location?: string;
  description?: string;
  htmlLink?: string;
  source?: "google" | "microsoft";
}

function formatTime(iso: string, allDay: boolean, tz?: string): string {
  if (allDay) return "All day";
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

function formatDate(iso: string, allDay: boolean, tz?: string): string {
  const d = allDay ? new Date(iso + "T12:00:00") : new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
}

function getDayKey(iso: string, allDay: boolean, tz?: string): string {
  if (allDay) return iso.slice(0, 10);
  return new Date(iso)
    .toLocaleDateString("en-CA", { timeZone: tz || Intl.DateTimeFormat().resolvedOptions().timeZone });
}

function isToday(dayKey: string): boolean {
  return dayKey === new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function isTomorrow(dayKey: string): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return dayKey === tomorrow.toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
}

function dayLabel(dayKey: string, firstEventIso: string, allDay: boolean): string {
  if (isToday(dayKey)) return "Today";
  if (isTomorrow(dayKey)) return "Tomorrow";
  return formatDate(firstEventIso, allDay);
}

export default function CalendarPage() {
  const [events, setEvents]     = useState<CalendarEvent[] | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [error, setError]         = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);

  const load = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch("/api/calendar").then((r) => r.json()),
      fetch("/api/microsoft-calendar").then((r) => r.json()),
    ])
      .then(([google, microsoft]) => {
        const googleEvents = (google.events || []).map((e: CalendarEvent) => ({ ...e, source: "google" as const }));
        const msEvents     = (microsoft.events || []).map((e: CalendarEvent) => ({ ...e, source: "microsoft" as const }));
        const merged = [...googleEvents, ...msEvents]
          .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        setEvents(merged);
        setFetchedAt(new Date().toISOString());
        if (google.error) setError(google.detail || google.error);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Group events by day
  const grouped: Record<string, CalendarEvent[]> = {};
  if (events) {
    for (const ev of events) {
      const key = getDayKey(ev.start, ev.allDay, ev.startTimeZone);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(ev);
    }
  }
  const days = Object.keys(grouped).sort();

  return (
    <div className="p-8 max-w-[780px] mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-[32px] font-semibold tracking-[-0.02em]">Calendar</h1>
        <button
          onClick={load}
          disabled={loading}
          className="text-sm px-3 py-1.5 rounded-lg"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--line)",
            color: "var(--ink-2)",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      <p className="text-[var(--ink-2)] mb-1 text-sm">
        Google + Microsoft &mdash; glen@xenlerconsulting.com &mdash; next 14 days
      </p>


      {fetchedAt && (
        <p className="text-[var(--ink-3)] mb-6 text-xs">
          Updated {new Date(fetchedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })}
        </p>
      )}

      {error && (
        <div
          className="p-4 rounded-xl mb-6 text-sm"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink-2)" }}
        >
          Could not load calendar: {error}
        </div>
      )}

      {!loading && !error && events?.length === 0 && (
        <div
          className="p-8 rounded-xl text-center text-[var(--ink-3)]"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          No events in the next 14 days.
        </div>
      )}

      {loading && !events && (
        <div
          className="p-8 rounded-xl text-center text-[var(--ink-3)]"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}
        >
          Fetching events...
        </div>
      )}

      <div className="flex flex-col gap-6">
        {days.map((day) => {
          const dayEvents = grouped[day];
          const firstEv = dayEvents[0];
          return (
            <div key={day}>
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <span
                  className="text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded"
                  style={{
                    background: isToday(day) ? "var(--accent, #6366f1)" : "var(--panel)",
                    color: isToday(day) ? "#fff" : "var(--ink-2)",
                    border: isToday(day) ? "none" : "1px solid var(--line)",
                  }}
                >
                  {dayLabel(day, firstEv.start, firstEv.allDay)}
                </span>
                <span className="text-xs text-[var(--ink-3)]">
                  {isToday(day) || isTomorrow(day)
                    ? formatDate(firstEv.start, firstEv.allDay, firstEv.startTimeZone)
                    : ""}
                </span>
              </div>

              {/* Events */}
              <div className="flex flex-col gap-2">
                {dayEvents.map((ev) => (
                  <a
                    key={ev.id}
                    href={ev.htmlLink || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 rounded-xl no-underline transition-opacity hover:opacity-80"
                    style={{
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <span
                        className="font-medium text-sm"
                        style={{ color: "var(--ink-1)" }}
                      >
                        {ev.summary}
                      </span>
                      <span
                        className="text-xs shrink-0 mt-0.5"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {formatTime(ev.start, ev.allDay, ev.startTimeZone)}
                        {!ev.allDay && (
                          <> &ndash; {formatTime(ev.end, ev.allDay, ev.endTimeZone ?? ev.startTimeZone)}</>
                        )}
                      </span>
                    </div>
                    {ev.location && (
                      <p
                        className="text-xs mt-1"
                        style={{ color: "var(--ink-3)" }}
                      >
                        📍 {ev.location}
                      </p>
                    )}
                    <div className="mt-1.5">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{
                          background: ev.source === "microsoft" ? "#0078d422" : "#ea433522",
                          color:      ev.source === "microsoft" ? "#0078d4"   : "#ea4335",
                        }}
                      >
                        {ev.source === "microsoft" ? "Outlook" : "Google"}
                      </span>
                    </div>
                    {ev.description && (
                      <p
                        className="text-xs mt-1 line-clamp-2"
                        style={{ color: "var(--ink-3)" }}
                      >
                        {ev.description}
                      </p>
                    )}
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
