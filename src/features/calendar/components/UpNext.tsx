"use client";
import { useMemo } from "react";
import { dayKey } from "@/lib/dates/date-utils";
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
    const nowMin = now.getHours() * 60 + now.getMinutes();
    // Filter to visible calendars already done by caller; here just pick earliest future
    const upcoming = events
      .filter((e) => !e.allDay)
      .filter((e) => {
        const dk = dayKey(e.startAt, timeZone);
        if (dk > todayKey) return true;
        if (dk === todayKey) {
          const endMin = Math.max(
            parseInt(formatInTimeZone(new Date(e.endAt), timeZone, "H")) * 60 + parseInt(formatInTimeZone(new Date(e.endAt), timeZone, "m")),
            0
          );
          return endMin > nowMin;
        }
        return false;
      })
      .sort((a, b) => a.startAt.localeCompare(b.startAt) || a.startAt.localeCompare(b.startAt))[0];
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
  const startMin = parseInt(formatInTimeZone(new Date(next.startAt), timeZone, "H")) * 60 + parseInt(formatInTimeZone(new Date(next.startAt), timeZone, "m"));
  const endMin = parseInt(formatInTimeZone(new Date(next.endAt), timeZone, "H")) * 60 + parseInt(formatInTimeZone(new Date(next.endAt), timeZone, "m"));
  const range = `${fmt(startMin)} – ${fmt(endMin)}`;
  // when label
  const now = new Date();
  const sd = new Date(next.startAt);
  const diff = Math.round((sd.getTime() - now.getTime()) / 60000);
  let when = "";
  if (diff <= 0) when = "Happening now";
  else if (diff < 60) when = `In ${diff} min`;
  else if (diff < 1440) when = `In ${Math.floor(diff / 60)} h${diff % 60 ? ` ${diff % 60} min` : ""}`;
  else {
    const dk = dayKey(next.startAt, timeZone);
    const tomorrowKey = formatInTimeZone(new Date(now.getTime() + 86400000), timeZone, "yyyy-MM-dd");
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
