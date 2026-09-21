"use client";
import { formatClock } from "@/lib/dates/date-utils";
import type { EventRecord } from "../types";

export function EventChip({
  event, timeZone, colorVar, onSelect,
}: { event: EventRecord; timeZone: string; colorVar: string; onSelect: (id: string) => void }) {
  return (
    <button
      className="chip"
      style={{ ["--c" as string]: colorVar }}
      onClick={() => onSelect(event.id)}
    >
      {!event.allDay && <b>{formatClock(event.startAt, timeZone)} </b>}
      {event.title}
    </button>
  );
}
