"use client";
import { useMemo } from "react";
import { dayKey } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";

export function MiniCalendar({
  anchor,
  timeZone,
  eventsByDate,
  onSelect,
  onPrev,
  onNext,
  selectedRange,
}: {
  anchor: Date;
  timeZone: string;
  eventsByDate: Set<string>;
  onSelect: (iso: string) => void;
  onPrev: () => void;
  onNext: () => void;
  selectedRange: [string, string];
}) {
  const { monthLabel, cells, todayKey } = useMemo(() => {
    const label = formatInTimeZone(anchor, timeZone, "MMMM yyyy");
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const start = new Date(first);
    const dow = (first.getDay() + 6) % 7; // Mon 0
    start.setDate(1 - dow);
    const today = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
    const arr: { date: Date; iso: string; isOut: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = formatInTimeZone(d, timeZone, "yyyy-MM-dd");
      const isOut = formatInTimeZone(d, timeZone, "MM") !== formatInTimeZone(anchor, timeZone, "MM");
      arr.push({ date: d, iso, isOut });
    }
    return { monthLabel: label, cells: arr, todayKey: today };
  }, [anchor, timeZone]);

  const [rs, re] = selectedRange;
  const selectedKey = formatInTimeZone(anchor, timeZone, "yyyy-MM-dd");

  return (
    <div className="mini">
      <div className="mini-h">
        <b>{monthLabel}</b>
        <span>
          <button className="icon" aria-label="Previous month" onClick={onPrev}>‹</button>
          <button className="icon" aria-label="Next month" onClick={onNext}>›</button>
        </span>
      </div>
      <div className="mgrid">
        {["M", "T", "W", "T", "F", "S", "S"].map((l, i) => (
          <div key={`${l}-${i}`} className="wd">
            {l}
          </div>
        ))}
        {cells.map(({ iso, date, isOut }) => {
          const isToday = iso === todayKey;
          const isSelected = iso === selectedKey;
          const inRange = iso >= rs && iso <= re;
          const has = eventsByDate.has(iso);
          const cls = `md${isOut ? " out" : ""}${isToday ? " today" : ""}${inRange ? " in" : ""}${isSelected ? " sel" : ""}`;
          return (
            <button key={iso} className={cls} onClick={() => onSelect(iso)} aria-label={date.toDateString()}>
              {formatInTimeZone(date, timeZone, "d")}
              {has && <i />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
