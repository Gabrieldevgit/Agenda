"use client";
/**
 * Day/Week time grid — ported from the prototype's timeGrid(). Overlap
 * placement comes from layoutDay(); drag/resize lives in useEventDrag().
 * Notebook v3 §3.5: Event → EventSegment → layoutSegments → render
 */
import { useMemo, useRef } from "react";
import { layoutDay } from "../lib/layout-events";
import { segmentEventsForDays, toSegmentClampedEvent } from "../lib/event-segmentation";
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

  // Notebook v3 §3.5: segment events per visible civil day, then layout clamped copies
  const segMap = useMemo(() => segmentEventsForDays(events, days, timeZone), [events, days, timeZone]);
  const gridRef = useRef<HTMLDivElement>(null);

  const { onPointerDown } = useEventDrag({ timeZone, hourHeight: HOUR, days, onMoveOrResize, gridRef: gridRef as any });

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
        <div className="tg-body" ref={gridRef as any} style={{ height: HOUR * 24 }}>
          <div className="gutter">
            {Array.from({ length: 23 }, (_, i) => i + 1).map((h) => (
              <span key={h} style={{ top: h * HOUR }}>{formatClock(new Date().toISOString(), timeZone) && `${h % 12 || 12}${h < 12 ? " AM" : " PM"}`}</span>
            ))}
          </div>
          {days.map((d) => {
            const key = dayKey(d.toISOString(), timeZone);
            const segments = segMap.get(key) ?? [];
            // Layout on clamped copies so layout and render use same interval (§3.5)
            const clamped = segments.map(toSegmentClampedEvent);
            // Map clamped id -> segment for original event + continues flags
            const segByClampedId = new Map(clamped.map((c, i) => [c.id, segments[i]!]));
            const laidOut = layoutDay(clamped, timeZone);
            const isToday = key === today;
            return (
              <div
                key={key}
                className={`col${isToday ? " today" : ""}`}
                data-day={key}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const minutes = Math.max(0, Math.floor(((e.clientY - rect.top) / HOUR) * 2) * 30);
                  onCreateAt(key, minutes);
                }}
              >
                {laidOut.map(({ event: clampedEv, column, columnCount }) => {
                  const seg = segByClampedId.get(clampedEv.id)!;
                  const orig = seg.event;
                  const start = seg.startMinutes;
                  const end = seg.endMinutes;
                  return (
                    <div
                      key={orig.id + (seg.continuesBefore ? "-b" : "") + (seg.continuesAfter ? "-a" : "")}
                      className="ev"
                      role="button"
                      tabIndex={0}
                      aria-label={`${orig.title} ${formatClock(orig.startAt, timeZone)}${seg.continuesBefore ? " (continues)" : ""}`}
                      style={{
                        top: (start * HOUR) / 60,
                        height: Math.max(22, ((end - start) * HOUR) / 60 - 2),
                        left: `calc(${(column / columnCount) * 100}% + 2px)`,
                        width: `calc(${100 / columnCount}% - 4px)`,
                        ["--c" as string]: colorOf(orig.calendarId),
                        opacity: seg.continuesBefore || seg.continuesAfter ? 0.92 : 1,
                      }}
                      onPointerDown={(e) => onPointerDown(e, orig, "move")}
                      onClick={(e) => { e.stopPropagation(); onSelectEvent(orig.id); }}
                    >
                      <div className="t">{orig.title}{seg.continuesAfter ? " →" : ""}</div>
                      <div className="rz" onPointerDown={(e) => { e.stopPropagation(); onPointerDown(e, orig, "resize"); }} />
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
