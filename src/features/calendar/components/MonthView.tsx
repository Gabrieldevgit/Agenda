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

  const todayKey = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
  return (
    <div className="month">
      <div className="mrow">
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
          <div key={d} className="mh">
            {d}
          </div>
        ))}
      </div>
      {Array.from({ length: 6 }, (_, r) => (
        <div key={r} className="mrow">
          {Array.from({ length: 7 }, (_, c) => {
            const idx = r * 7 + c;
            const d = grid[idx]!;
            const key = formatInTimeZone(d, timeZone, "yyyy-MM-dd");
            const list = byDay.get(key) ?? [];
            const isOut = formatInTimeZone(d, timeZone, "MM") !== formatInTimeZone(anchor, timeZone, "MM");
            const isToday = key === todayKey;
            return (
              <div
                key={key}
                className={`mcell${isOut ? " out" : ""}${isToday ? " today" : ""}`}
                data-date={key}
                onClick={() => onCreateAt(key, 9 * 60)}
              >
                <span className="num">{formatInTimeZone(d, timeZone, "d")}</span>
                {list.slice(0, 3).map((ev) => (
                  <button
                    key={ev.id}
                    onClick={(e) => { e.stopPropagation(); onSelectEvent(ev.id); }}
                    className="chip"
                    style={{ ["--c" as string]: colorOf(ev.calendarId) } as any}
                  >
                    {!ev.allDay && <b>{formatClock(ev.startAt, timeZone)} </b>}
                    {ev.title}
                  </button>
                ))}
                {list.length > 3 && (
                  <button className="more" onClick={(e) => { e.stopPropagation(); onSelectEvent(list[3]!.id); }}>
                    +{list.length - 3} more
                  </button>
                )}
                <div className="dots">
                  {list.slice(0, 5).map((ev) => (
                    <i key={ev.id} style={{ ["--c" as string]: colorOf(ev.calendarId) } as any} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
