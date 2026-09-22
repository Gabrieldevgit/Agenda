"use client";
/**
 * Pointer-based drag/resize with 15-minute snapping + day-column move.
 * Notebook v3 §3.3/3.4: tracks startX/startY + originDay, computes target civil day via column hit-test,
 * uses instant duration (ms) not minutesOfDay diff to handle cross-midnight.
 */
import { useCallback, useRef } from "react";
import { toInstant, dayKey } from "@/lib/dates/date-utils";
import { minutesOfDay } from "@/lib/dates/date-utils";
import type { EventRecord } from "../types";

const SNAP_MINUTES = 15;

type DragArgs = {
  timeZone: string;
  hourHeight: number;
  days: Date[];
  gridRef?: React.RefObject<HTMLDivElement>;
  onMoveOrResize: (id: string, startAt: string, endAt: string) => void;
};

export function useEventDrag({ timeZone, hourHeight, days, gridRef, onMoveOrResize }: DragArgs) {
  const dragRef = useRef<{ event: EventRecord; mode: "move" | "resize"; startX: number; startY: number; originDayKey: string } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, event: EventRecord, mode: "move" | "resize") => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const originDayKey = dayKey(event.startAt, timeZone);
      dragRef.current = { event, mode, startX: e.clientX, startY: e.clientY, originDayKey };
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = () => {};
      const onUp = (upEvent: PointerEvent) => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;

        const deltaMinutes = Math.round(((upEvent.clientY - drag.startY) / hourHeight) * 60 / SNAP_MINUTES) * SNAP_MINUTES;

        // Determine target day via horizontal delta / column hit-test (Notebook v3 §3.3)
        let targetDayKey = drag.originDayKey;
        if (drag.mode === "move") {
          // Prefer hit-testing actual day columns if gridRef available
          if (gridRef?.current) {
            const cols = Array.from(gridRef.current.querySelectorAll<HTMLDivElement>("[data-day]"));
            let found: string | null = null;
            for (const col of cols) {
              const rect = col.getBoundingClientRect();
              if (upEvent.clientX >= rect.left && upEvent.clientX <= rect.right) {
                found = col.getAttribute("data-day");
                break;
              }
            }
            if (found) targetDayKey = found;
            else {
              // Fallback: estimate column from deltaX
              const idx = days.findIndex((d) => dayKey(d.toISOString(), timeZone) === drag.originDayKey);
              if (idx >= 0) {
                const colWidth = (gridRef.current.getBoundingClientRect().width - 56) / Math.max(1, days.length);
                const deltaCols = Math.round((upEvent.clientX - drag.startX) / Math.max(1, colWidth));
                const targetIdx = Math.max(0, Math.min(days.length - 1, idx + deltaCols));
                targetDayKey = dayKey(days[targetIdx]!.toISOString(), timeZone);
              }
            }
          } else if (days.length > 1) {
            const idx = days.findIndex((d) => dayKey(d.toISOString(), timeZone) === drag.originDayKey);
            if (idx >= 0) {
              const approxColWidth = 120; // fallback
              const deltaCols = Math.round((upEvent.clientX - drag.startX) / approxColWidth);
              const targetIdx = Math.max(0, Math.min(days.length - 1, idx + deltaCols));
              targetDayKey = dayKey(days[targetIdx]!.toISOString(), timeZone);
            }
          }
        }

        if (drag.mode === "resize") {
          if (deltaMinutes === 0) return;
          const startMin = minutesOfDay(drag.event.startAt, timeZone);
          const endMin = minutesOfDay(drag.event.endAt, timeZone);
          // Use instant duration for cross-midnight safety? For resize we adjust end only in origin day.
          const newEnd = Math.max(startMin + SNAP_MINUTES, endMin + deltaMinutes);
          const clampedEnd = Math.max(0, Math.min(24 * 60, newEnd));
          // If clamped beyond day, it will spill to next day via next render — allow up to 24*60
          const endInstant = toInstant(drag.originDayKey, clampedEnd === 1440 ? 1439 : clampedEnd, timeZone);
          // If end is exactly midnight, represent as next day 00:00
          let finalEnd = endInstant;
          if (clampedEnd >= 1440) {
            const nextDay = dayKey(new Date(new Date(endInstant).getTime() + 60000).toISOString(), timeZone);
            // Actually just use next day 00:00
            finalEnd = toInstant(targetDayKey === drag.originDayKey ? drag.originDayKey : targetDayKey, 0, timeZone);
            // Recompute: we wanted next day 00:00 — but resize beyond day should just be end of day
            finalEnd = toInstant(drag.originDayKey, 1439, timeZone);
          }
          // For resize, keep start same, end scaled; if cross-midnight original, preserve that by using duration ms for clamping?
          onMoveOrResize(drag.event.id, drag.event.startAt, finalEnd);
        } else {
          // MOVE: Notebook v3 §3.4 cross-midnight duration via ms
          if (deltaMinutes === 0 && targetDayKey === drag.originDayKey) return;
          const startMin = minutesOfDay(drag.event.startAt, timeZone);
          const durationMs = new Date(drag.event.endAt).getTime() - new Date(drag.event.startAt).getTime();
          const newStartMin = Math.max(0, Math.min(1439, startMin + deltaMinutes));
          const newStartInstant = toInstant(targetDayKey, newStartMin, timeZone);
          const newEndInstant = new Date(new Date(newStartInstant).getTime() + Math.max(15 * 60000, durationMs)).toISOString();
          onMoveOrResize(drag.event.id, newStartInstant, newEndInstant);
        }
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    },
    [hourHeight, timeZone, onMoveOrResize, days, gridRef]
  );

  return { onPointerDown };
}
