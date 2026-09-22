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
    // Handle cross-midnight via instant duration when end <= start (end is next day)
    const durationMs = new Date(event.endAt).getTime() - new Date(event.startAt).getTime();
    const spansDays = startK !== endK;
    if (endMinFull <= startMinFull && durationMs > 0 && !spansDays) {
      // Single-day but end < start due to DST? treat as next day spill
      endMinFull = startMinFull + Math.max(15, Math.round(durationMs / 60000));
    }

    for (const d of days) {
      const k = dayKey(d.toISOString(), timeZone);
      if (k < startK || k > endK) continue;
      let s = 0, e = 1440;
      let before = false, after = false;
      if (k === startK) { s = startMinFull; } else { before = true; }
      if (k === endK) { e = endMinFull; if (endMinFull === 0 && durationMs > 0) e = 1440; } else { after = true; }
      if (k !== startK && k !== endK) { s = 0; e = 1440; before = true; after = true; }
      // Clamp single-day multi-hour that got 0 due to midnight
      if (s === e) e = s + 15;
      if (e > s) {
        const seg: EventSegment = { event, dayKey: k, startMinutes: Math.max(0, Math.min(1440, s)), endMinutes: Math.max(0, Math.min(1440, e)), continuesBefore: before, continuesAfter: after };
        map.get(k)!.push(seg);
      }
    }
  }
  return map;
}

export function toSegmentClampedEvent(seg: EventSegment): EventRecord {
  // For layoutDay which expects EventRecord with minutesOfDay, synthesize clamped instants
  const startAt = toInstant(seg.dayKey, seg.startMinutes, seg.event.timezone);
  const endAt = toInstant(seg.dayKey, seg.endMinutes, seg.event.timezone);
  return { ...seg.event, startAt, endAt };
}
