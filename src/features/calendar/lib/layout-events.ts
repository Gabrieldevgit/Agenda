/**
 * Overlap layout for one day's timed events — ported from the prototype's
 * `layout()`. Pure function, fully unit-testable, no DOM.
 */
import type { EventRecord, LaidOutEvent } from "../types";
import { minutesOfDay } from "@/lib/dates/date-utils";

export function layoutDay(events: EventRecord[], timeZone: string): LaidOutEvent[] {
  const withMinutes = events
    .map((event) => ({
      event,
      start: minutesOfDay(event.startAt, timeZone),
      end: Math.max(minutesOfDay(event.endAt, timeZone), minutesOfDay(event.startAt, timeZone) + 15),
    }))
    .sort((a, b) => a.start - b.start || b.end - a.end);

  const out: LaidOutEvent[] = [];
  let cluster: typeof withMinutes = [];
  let clusterEnd = -1;

  const flush = () => {
    if (cluster.length === 0) return;
    const columnEnds: number[] = [];
    const placed = cluster.map((item) => {
      let column = columnEnds.findIndex((end) => end <= item.start);
      if (column < 0) {
        column = columnEnds.length;
        columnEnds.push(0);
      }
      columnEnds[column] = item.end;
      return { item, column };
    });
    for (const { item, column } of placed) {
      out.push({ event: item.event, column, columnCount: columnEnds.length });
    }
    cluster = [];
  };

  for (const item of withMinutes) {
    if (item.start >= clusterEnd) {
      flush();
      clusterEnd = item.end;
    } else {
      clusterEnd = Math.max(clusterEnd, item.end);
    }
    cluster.push(item);
  }
  flush();

  return out;
}
