"use client";
/**
 * Day/Week time grid — ported from the prototype's timeGrid(). Overlap
 * placement comes from layoutDay(); drag/resize lives in useEventDrag().
 */
import { useMemo } from "react";
import { layoutDay } from "../lib/layout-events";
import { dayKey, formatClock, minutesOfDay } from "@/lib/dates/date-utils";
import type { CalendarSummary, EventRecord } from "../types";
import { useEventDrag } from "../hooks/useEventDrag";

const HOUR = 56;

export function TimeGrid({
  days, events, calendars, timeZone, onSelectEvent, onCreateAt, onMoveOrResize,
}: {
  days: Date[];
  events: EventRecord[];
  calendars: CalendarSummary[];
  timeZone: string;
  onSelectEvent: (id: string) => void;
  onCreateAt: (dateKey: string, minutes: number) => void;
  onMoveOrResize: (id: string, startAt: string, endAt: string) => void;
}) {
  const colorOf = (calendarId: string) =>
    calendars.find((c) => c.id === calendarId)?.color ?? "var(--accent)";

  // Multi-day handling (Notebook v2 §24): segment events that span civil days.
  const byDay = useMemo(() => {
    const map = new Map<string, EventRecord[]>();
    for (const day of days) map.set(dayKey(day.toISOString(), timeZone), []);
    for (const event of events) {
      if (event.allDay) continue;
      // Simple segment: if event spans days, add a display copy to each day it touches.
      // We keep the original instant but clamp visual minutes per day via segment logic in render.
      // For overlap layout we need per-day occurrence slices.
      const startKey = dayKey(event.startAt, timeZone);
      const endKey = dayKey(event.endAt, timeZone);
      if (startKey === endKey) {
        if (map.has(startKey)) map.get(startKey)!.push(event);
      } else {
        // Multi-day: add to every day between start and end inclusive.
        for (const d of days) {
          const k = dayKey(d.toISOString(), timeZone);
          // Check if event's [startAt, endAt) overlaps this civil day [00:00, 24:00).
          const dayStart = new Date(k + "T00:00:00");
          // Use timezone-aware comparison via dayKey: include if k between startKey and endKey.
          if (k >= startKey && k <= endKey && map.has(k)) {
            map.get(k)!.push(event);
          }
        }
      }
    }
    return map;
  }, [days, events, timeZone]);

  const { onPointerDown } = useEventDrag({ timeZone, hourHeight: HOUR, onMoveOrResize });

  const today = dayKey(new Date().toISOString(), timeZone);
  const nowMinutes = minutesOfDay(new Date().toISOString(), timeZone);

  return (
    <div className="tg-wrap">
      <div className="tg-inner" style={{ ["--n" as string]: days.length }}>
        <div className="tg-head">
          <div />
          {days.map((d) => {
            const key = dayKey(d.toISOString(), timeZone);
            return (
              <div key={key} className={`dh${key === today ? " today" : ""}`}>
                <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                <span className="dd">{d.getDate()}</span>
              </div>
            );
          })}
        </div>
        <div className="tg-body" style={{ height: HOUR * 24 }}>
          <div className="gutter">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span key={h} style={{ top: h * HOUR }}>{formatClock(new Date().toISOString(), timeZone) && `${h % 12 || 12}${h < 12 ? " AM" : " PM"}`}</span>
            ))}
          </div>
          {days.map((d) => {
            const key = dayKey(d.toISOString(), timeZone);
            const laidOut = layoutDay(byDay.get(key) ?? [], timeZone);
            const isToday = key === today;
            return (
              <div
                key={key}
                className={`col${isToday ? " today" : ""}`}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.max(0, Math.floor(((e.clientY - rect.top) / HOUR) * 2) * 30);
                  onCreateAt(key, minutes);
                }}
              >
                {laidOut.map(({ event, column, columnCount }) => {
                  // For multi-day, clamp visual to this civil day.
                  const dayStartKey = key;
                  const startKey = dayKey(event.startAt, timeZone);
                  const endKey = dayKey(event.endAt, timeZone);
                  let start = minutesOfDay(event.startAt, timeZone);
                  let end = Math.max(start + 15, minutesOfDay(event.endAt, timeZone));
                  if (dayStartKey !== startKey) start = 0;
                  if (dayStartKey !== endKey) end = 1440;
                  if (dayStartKey !== startKey && dayStartKey !== endKey) { start = 0; end = 1440; }
                  return (
                    <div
                      key={event.id}
                      className="ev"
                      role="button"
                      tabIndex={0}
                      aria-label={`${event.title} ${formatClock(event.startAt, timeZone)}`}
                      style={{
                        top: (start * HOUR) / 60,
                        height: Math.max(22, ((end - start) * HOUR) / 60 - 2),
                        left: `calc(${(column / columnCount) * 100}% + 2px)`,
                        width: `calc(${100 / columnCount}% - 4px)`,
                        ["--c" as string]: colorOf(event.calendarId),
                      }}
                      onPointerDown={(e) => onPointerDown(e, event, "move")}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent(event.id); }}
                    >
                      <div className="t">{event.title}</div>
                      <div className="rz" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, event, "resize"); }} />
                    </div>
                  );
                })}
                {isToday && <div className="now" style={{ top: (nowMinutes * HOUR) / 60 }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
