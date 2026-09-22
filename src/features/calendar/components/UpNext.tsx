"use client";
import { useMemo } from "react";
import { dayKey, minutesOfDay, addDays } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";
import type { EventRecord, CalendarSummary } from "../types";

function fmt(m: number) {
  const h = Math.floor(m / 60) % 24;
  const mi = m % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (h % 12 || 12) + (mi ? ":" + pad(mi) : "") + " " + (h < 12 ? "AM" : "PM");
}

export function UpNext({
  events,
  calendars,
  timeZone,
}: {
  events: EventRecord[];
  calendars: CalendarSummary[];
  timeZone: string;
}) {
  const next = useMemo(() => {
    const now = new Date();
    const todayKey = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
    const nowMin = minutesOfDay(now.toISOString(), timeZone);
    const upcoming = events
      .filter((e) => !e.allDay)
      .filter((e) => {
        const dk = dayKey(e.startAt, timeZone);
        if (dk > todayKey) return true;
        if (dk === todayKey) {
          const endMin = minutesOfDay(e.endAt, timeZone);
          return endMin > nowMin;
        }
        return false;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt))[0];
    return upcoming ?? null;
  }, [events, timeZone]);

  if (!next) {
    return (
      <div className="card">
        <small>Up next</small>
        <div className="n">Nothing coming up</div>
      </div>
    );
  }
  const cal = calendars.find((c) => c.id === next.calendarId);
  const col = cal?.color ?? "var(--accent)";
  const startMin = minutesOfDay(next.startAt, timeZone);
  const endMin = minutesOfDay(next.endAt, timeZone);
  const range = `${fmt(startMin)} – ${fmt(endMin)}`;
  const now = new Date();
  const sd = new Date(next.startAt);
  const diff = Math.round((sd.getTime() - now.getTime()) / 60000);
  let when = "";
  if (diff <= 0) when = "Happening now";
  else if (diff < 60) when = `In ${diff} min`;
  else if (diff < 1440) when = `In ${Math.floor(diff / 60)} h${diff % 60 ? ` ${diff % 60} min` : ""}`;
  else {
    const dk = dayKey(next.startAt, timeZone);
    const tomorrowKey = formatInTimeZone(addDays(now, 1, timeZone), timeZone, "yyyy-MM-dd");
    when = dk === tomorrowKey ? `Tomorrow, ${fmt(startMin)}` : `${formatInTimeZone(new Date(next.startAt), timeZone, "EEEE")}, ${fmt(startMin)}`;
  }

  return (
    <div className="card" style={{ ["--c" as string]: col } as any}>
      <div className="bar" />
      <small>Up next · {when}</small>
      <div className="n">{next.title}</div>
      <div className="w">
        {range}
        {next.location ? ` · ${next.location}` : ""}
      </div>
    </div>
  );
}
