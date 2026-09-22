"use client";
/**
 * Print-only layout, portaled to <body> so it sits outside `.app`'s flex
 * chrome. Hidden on screen (`#print-root { display: none }` in
 * globals.css) and shown only when `body.printing` is set + the browser's
 * print media applies — see the `@media print` block in globals.css.
 */
import { createPortal } from "react-dom";
import { addDays } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import type { CalendarSummary, EventRecord } from "@/features/calendar/types";
import type { PrintScope } from "../lib/print-range";

function eventsForDay(events: EventRecord[], day: Date, timeZone: string): EventRecord[] {
  const dayEnd = addDays(day, 1, timeZone);
  return events
    .filter((e) => new Date(e.startAt) < dayEnd && new Date(e.endAt) > day)
    .sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
    });
}

function calFor(calendars: CalendarSummary[], id: string) {
  return calendars.find((c) => c.id === id);
}

export function PrintPreview({
  scope,
  title,
  days,
  events,
  calendars,
  timeZone,
  includeDetails,
}: {
  scope: PrintScope;
  title: string;
  days: Date[];
  events: EventRecord[];
  calendars: CalendarSummary[];
  timeZone: string;
  includeDetails: boolean;
}) {
  if (typeof document === "undefined") return null;

  const body =
    scope === "month" ? (
      <MonthGrid days={days} events={events} calendars={calendars} timeZone={timeZone} />
    ) : scope === "week" ? (
      <WeekColumns days={days} events={events} calendars={calendars} timeZone={timeZone} includeDetails={includeDetails} />
    ) : (
      <DayList days={days} events={events} calendars={calendars} timeZone={timeZone} includeDetails={includeDetails} />
    );

  return createPortal(
    <div id="print-root">
      <div className="pr-head">
        <div className="pr-mark" />
        <div>
          <h1>{title}</h1>
          <p>Tempo — {new Intl.DateTimeFormat(undefined, { dateStyle: "long" }).format(new Date())}</p>
        </div>
      </div>
      {calendars.length > 0 && (
        <div className="pr-legend">
          {calendars.map((c) => (
            <span key={c.id} className="pr-legend-item">
              <i style={{ background: c.color }} />
              {c.name}
            </span>
          ))}
        </div>
      )}
      {body}
    </div>,
    document.body
  );
}

function EventLine({ ev, cal, timeZone, includeDetails }: { ev: EventRecord; cal?: CalendarSummary; timeZone: string; includeDetails: boolean }) {
  return (
    <div className="pr-ev" style={{ borderLeftColor: cal?.color ?? "#999" }}>
      <span className="pr-ev-time">
        {ev.allDay ? "All day" : formatInTimeZone(new Date(ev.startAt), timeZone, "h:mm a")}
      </span>
      <span className="pr-ev-body">
        <span className="pr-ev-title">{ev.title || "(No title)"}</span>
        {includeDetails && ev.location && <span className="pr-ev-loc">{ev.location}</span>}
        {includeDetails && ev.description && <span className="pr-ev-desc">{ev.description}</span>}
      </span>
    </div>
  );
}

function DayList({ days, events, calendars, timeZone, includeDetails }: { days: Date[]; events: EventRecord[]; calendars: CalendarSummary[]; timeZone: string; includeDetails: boolean }) {
  return (
    <div className="pr-daylist">
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day, timeZone);
        return (
          <div className="pr-day" key={day.toISOString()}>
            <div className="pr-day-h">{formatInTimeZone(day, timeZone, "EEEE, MMMM d, yyyy")}</div>
            {dayEvents.length === 0 ? (
              <p className="pr-empty">No events.</p>
            ) : (
              dayEvents.map((ev) => <EventLine key={ev.id} ev={ev} cal={calFor(calendars, ev.calendarId)} timeZone={timeZone} includeDetails={includeDetails} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

function WeekColumns({ days, events, calendars, timeZone, includeDetails }: { days: Date[]; events: EventRecord[]; calendars: CalendarSummary[]; timeZone: string; includeDetails: boolean }) {
  return (
    <div className="pr-week">
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day, timeZone);
        return (
          <div className="pr-weekcol" key={day.toISOString()}>
            <div className="pr-day-h small">{formatInTimeZone(day, timeZone, "EEE d")}</div>
            {dayEvents.length === 0 ? (
              <p className="pr-empty">—</p>
            ) : (
              dayEvents.map((ev) => <EventLine key={ev.id} ev={ev} cal={calFor(calendars, ev.calendarId)} timeZone={timeZone} includeDetails={includeDetails} />)
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({ days, events, calendars, timeZone }: { days: Date[]; events: EventRecord[]; calendars: CalendarSummary[]; timeZone: string }) {
  const monthOfMiddle = days[Math.floor(days.length / 2)]!.getMonth();
  return (
    <div className="pr-month">
      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((w) => (
        <div className="pr-mh" key={w}>{w}</div>
      ))}
      {days.map((day) => {
        const dayEvents = eventsForDay(events, day, timeZone);
        const out = day.getMonth() !== monthOfMiddle;
        return (
          <div className={`pr-mcell${out ? " out" : ""}`} key={day.toISOString()}>
            <div className="pr-mnum">{formatInTimeZone(day, timeZone, "d")}</div>
            {dayEvents.map((ev) => (
              <div className="pr-chip" key={ev.id} style={{ borderLeftColor: calFor(calendars, ev.calendarId)?.color ?? "#999" }}>
                {!ev.allDay && <b>{formatInTimeZone(new Date(ev.startAt), timeZone, "h:mma")} </b>}
                {ev.title || "(No title)"}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
