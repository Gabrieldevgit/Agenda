import type { EventRecord } from "../types";
import { dayKey, minutesOfDay, toInstant } from "@/lib/dates/date-utils";

export type LocalDate = string; // YYYY-MM-DD
export type EventSegment = {
  event: EventRecord;
  dayKey: LocalDate;
  startMinutes: number;
  endMinutes: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
};

/**
 * Notebook v3 §3.5 / §15: Event → visible-day segments → layout
 * Each event is split by civil days in `timeZone`; each segment is self-contained for layout.
 */
export function segmentEventsForDays(events: EventRecord[], days: Date[], timeZone: string): Map<LocalDate, EventSegment[]> {
  const map = new Map<LocalDate, EventSegment[]>();
  for (const d of days) map.set(dayKey(d.toISOString(), timeZone), []);

  for (const event of events) {
    if (event.allDay) continue;
    const startK = dayKey(event.startAt, timeZone);
    const endK = dayKey(event.endAt, timeZone);
    const startMinFull = minutesOfDay(event.startAt, timeZone);
    let endMinFull = minutesOfDay(event.endAt, timeZone);
    const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
    const spansDays = startK !== endK;
    if (endMinFull <= startMinFull && durationMs > 0 && !spansDays) {
      endMinFull = startMinFull + Math.max(15, Math.round(durationMs / 60000));
    }

    for (const d of days) {
      const k = dayKey(d.toISOString(), timeZone);
      if (k < startK || k > endK) continue;
      // P1 §7: end at midnight must not fill next day — previous day is 22:00→1440, next day not rendered
      if (k === endK && endMinFull === 0 && durationMs > 0) continue;
      let s = 0, e = 1440;
      let before = false, after = false;
      if (k === startK) { s = startMinFull; } else { before = true; }
      if (k === endK) { e = endMinFull; } else { after = true; }
      if (k !== startK && k !== endK) { s = 0; e = 1440; before = true; after = true; }
      if (s === e) e = s + 15;
      if (e > s) {
        const seg: EventSegment = { event, dayKey: k, startMinutes: Math.max(0, Math.min(1440, s)), endMinutes: Math.max(0, Math.min(1440, e)), continuesBefore: before, continuesAfter: after };
        map.get(k)!.push(seg);
      }
    }
  }
  return map;
}

// P1 §10: layout directly on segments — no fake EventRecord reconstruction with wrong timezone
export function layoutSegments(segments: EventSegment[]): { segment: EventSegment; column: number; columnCount: number }[] {
  const withMinutes = segments
    .map((seg) => ({ seg, start: seg.startMinutes, end: Math.max(seg.endMinutes, seg.startMinutes + 15) }))
    .sort((a, b) => a.start - b.start || b.end - a.end);
  const out: { segment: EventSegment; column: number; columnCount: number }[] = [];
  let cluster: typeof withMinutes = [];
  let clusterEnd = -1;
  const flush = () => {
    if (!cluster.length) return;
    const colEnds: number[] = [];
    const placed = cluster.map((it) => {
      let col = colEnds.findIndex((end) => end <= it.start);
      if (col < 0) { col = colEnds.length; colEnds.push(0); }
      colEnds[col] = it.end;
      return { it, col };
    });
    for (const { it, col } of placed) out.push({ segment: it.seg, column: col, columnCount: colEnds.length });
    cluster = [];
  };
  for (const it of withMinutes) {
    if (it.start >= clusterEnd) { flush(); clusterEnd = it.end; } else clusterEnd = Math.max(clusterEnd, it.end);
    cluster.push(it);
  }
  flush();
  return out;
}

export function toSegmentClampedEvent(seg: EventSegment, viewTimeZone: string): EventRecord {
  // Deprecated: prefer layoutSegments. Kept for backward compat but now uses view timezone, not event timezone.
  const startAt = toInstant(seg.dayKey, seg.startMinutes, viewTimeZone);
  const endAt = toInstant(seg.dayKey, seg.endMinutes, viewTimeZone);
  return { ...seg.event, startAt, endAt };
}
