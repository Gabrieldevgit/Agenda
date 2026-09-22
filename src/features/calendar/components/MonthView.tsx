"use client";
import { useMemo } from "react";
import { addDays, dayKey, formatClock } from "@/lib/dates/date-utils";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import type { CalendarSummary, EventRecord } from "../types";

export function MonthView({
  anchor,
  events,
  calendars,
  timeZone,
  onSelectEvent,
  onCreateAt,
}: {
  anchor: Date;
  events: EventRecord[];
  calendars: CalendarSummary[];
  timeZone: string;
  onSelectEvent: (id: string) => void;
  onCreateAt: (dateKey: string, minutes: number) => void;
}) {
  const colorOf = (id: string) => calendars.find((c) => c.id === id)?.color ?? "var(--accent)";

  const { grid, daysInMonth } = useMemo(() => {
    const zoned = toZonedTime(anchor, timeZone);
    const monthStart = new Date(zoned.getFullYear(), zoned.getMonth(), 1);
    const startDow = (monthStart.getDay() + 6) % 7; // Mon=0
    const cells: Date[] = [];
    const start = new Date(monthStart);
    start.setDate(1 - startDow);
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    const daysInMonthVal = new Date(zoned.getFullYear(), zoned.getMonth() + 1, 0).getDate();
    return { grid: cells, daysInMonth: daysInMonthVal };
  }, [anchor, timeZone]);

  // Notebook v3 §3.2: month must show each touched day, not just start
  const byDay = useMemo(() => {
    const m = new Map<string, EventRecord[]>();
    for (const cell of grid) {
      const k = formatInTimeZone(cell, timeZone, "yyyy-MM-dd");
      m.set(k, []);
    }
    for (const e of events) {
      const startK = dayKey(e.startAt, timeZone);
      const endK = dayKey(e.endAt, timeZone);
      // Push to every grid day between startK and endK inclusive (handles multi-day)
      for (const [k, arr] of m.entries()) {
        if (k >= startK && k <= endK) arr.push(e);
      }
    }
    return m;
  }, [grid, events, timeZone]);

  return (
    <div className="month-wrap" style={{ height: "100%", overflow: "auto", padding: 8 }}>
      <div className="month-grid" style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 1, background: "var(--line)", border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden" }}>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} style={{ background: "var(--surface)", padding: "8px 6px", textAlign: "center", fontWeight: 600, fontSize: 12, color: "var(--muted)" }}>{d}</div>
        ))}
        {grid.map((d) => {
          const key = formatInTimeZone(d, timeZone, "yyyy-MM-dd");
          const isCurrentMonth = d.getMonth() === toZonedTime(anchor, timeZone).getMonth();
          const list = byDay.get(key) ?? [];
          return (
            <div
              key={key}
              onClick={() => onCreateAt(key, 9 * 60)}
              style={{ background: "var(--surface)", minHeight: 92, padding: 6, cursor: "cell", opacity: isCurrentMonth ? 1 : 0.52 }}
            >
              <div style={{ fontWeight: 600, fontSize: 12, color: isCurrentMonth ? "var(--ink)" : "var(--muted)" }}>{d.getDate()}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                {list.slice(0, 3).map((ev) => (
                  <button key={ev.id} onClick={(e) => { e.stopPropagation(); onSelectEvent(ev.id); }} className="chip" style={{ ["--c" as string]: colorOf(ev.calendarId), fontSize: 11 } as any}>
                    {!ev.allDay && <b>{formatClock(ev.startAt, timeZone)} </b>}{ev.title}
                  </button>
                ))}
                {list.length > 3 && <span style={{ fontSize: 11, color: "var(--muted)" }}>+{list.length - 3} more</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
