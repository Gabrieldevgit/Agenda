"use client";
import { useMemo } from "react";
import { formatInTimeZone, toZonedTime } from "date-fns-tz";
import { addMonths } from "@/lib/dates/date-utils";

export function DatePicker({
  anchor,
  timeZone,
  weekStart = "monday",
  onSelect,
  onClose,
}: {
  anchor: Date;
  timeZone: string;
  weekStart?: "monday" | "sunday";
  onSelect: (iso: string) => void;
  onClose: () => void;
}) {
  const grid = useMemo(() => {
    const zoned = toZonedTime(anchor, timeZone);
    const monthStart = new Date(zoned.getFullYear(), zoned.getMonth(), 1);
    const startDow = weekStart === "sunday" ? monthStart.getDay() : (monthStart.getDay() + 6) % 7;
    const start = new Date(monthStart);
    start.setDate(1 - startDow);
    const cells: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      cells.push(d);
    }
    return cells;
  }, [anchor, timeZone, weekStart]);

  const monthLabel = formatInTimeZone(anchor, timeZone, "MMMM yyyy");
  const todayKey = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd");
  const weekdays = weekStart === "sunday" ? ["Su","Mo","Tu","We","Th","Fr","Sa"] : ["Mo","Tu","We","Th","Fr","Sa","Su"];

  return (
    <div className="ov" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="dlg" style={{ maxWidth: 340 }} role="dialog" aria-modal="true" aria-label="Pick a date">
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 8 }}>
          <button className="icon" onClick={() => { /* shift anchor locally? parent controls */ }} style={{ visibility:"hidden" }}>‹</button>
          <b style={{ font: "700 15px var(--font-display)" }}>{monthLabel}</b>
          <button className="btn ghost" onClick={onClose} style={{ height: 28, padding:"0 10px" }}>Close</button>
        </div>
        <div className="mgrid">
          {weekdays.map(d => <div key={d} className="wd" style={{ textAlign:"center" }}>{d}</div>)}
          {grid.map((d) => {
            const k = formatInTimeZone(d, timeZone, "yyyy-MM-dd");
            const isOut = formatInTimeZone(d, timeZone, "MM") !== formatInTimeZone(anchor, timeZone, "MM");
            const isToday = k === todayKey;
            const isSel = k === formatInTimeZone(anchor, timeZone, "yyyy-MM-dd");
            return (
              <button key={k} className={`md${isOut ? " out" : ""}${isToday ? " today" : ""}${isSel ? " sel" : ""}`} onClick={() => { onSelect(k); onClose(); }} style={{ borderRadius: isSel ? 15 : undefined }}>
                {formatInTimeZone(d, timeZone, "d")}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", gap:8, marginTop:12 }}>
          <button className="btn" style={{ flex:1 }} onClick={() => { const k = formatInTimeZone(new Date(), timeZone, "yyyy-MM-dd"); onSelect(k); onClose(); }}>Today</button>
          <button className="btn ghost" style={{ flex:1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
