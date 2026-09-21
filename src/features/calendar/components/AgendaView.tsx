"use client";
import { useMemo } from "react";
import { dayKey, formatRange } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import type { CalendarSummary, EventRecord } from "../types";

export function AgendaView({
  events,
  calendars,
  timeZone,
  onSelectEvent,
}: {
  events: EventRecord[];
  calendars: CalendarSummary[];
  timeZone: string;
  onSelectEvent: (id: string) => void;
}) {
  const colorOf = (id: string) => calendars.find((c) => c.id === id)?.color ?? "var(--accent)";

  const grouped = useMemo(() => {
    const m = new Map<string, EventRecord[]>();
    const sorted = [...events].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    for (const e of sorted) {
      const k = e.allDay ? dayKey(e.startAt, timeZone) : dayKey(e.startAt, timeZone);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(e);
    }
    return Array.from(m.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events, timeZone]);

  if (grouped.length === 0) return <p style={{ padding: 16, color: "var(--muted)" }}>No events in this range.</p>;

  return (
    <div style={{ height: "100%", overflow: "auto", padding: 12 }}>
      {grouped.map(([day, list]) => (
        <div key={day} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
            {formatInTimeZone(new Date(day + "T12:00:00"), timeZone, "EEEE, MMMM d, yyyy")}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {list.map((ev) => (
              <button
                key={ev.id}
                onClick={() => onSelectEvent(ev.id)}
                style={{
                  textAlign: "left",
                  border: "1px solid var(--line)",
                  background: "var(--surface)",
                  borderRadius: 12,
                  padding: "10px 12px",
                  borderLeft: `4px solid ${colorOf(ev.calendarId)}`,
                  borderLeftColor: colorOf(ev.calendarId) as string,
                }}
              >
                <div style={{ fontWeight: 600 }}>{ev.title}</div>
                <div style={{ fontSize: 12, color: "var(--muted)" }}>
                  {ev.allDay ? "All day" : formatRange(ev.startAt, ev.endAt, timeZone)} {ev.location ? `· ${ev.location}` : ""}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
