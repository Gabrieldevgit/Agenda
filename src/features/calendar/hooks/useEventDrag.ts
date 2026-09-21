"use client";
/**
 * Pointer-based drag/resize with 15-minute snapping (Construction Notebook §2:
 * "Direct manipulation"). Works for mouse and touch because it's built on
 * Pointer Events; a keyboard alternative (arrow keys to nudge, once an event
 * is focused) should be added alongside this before shipping — tracked as a
 * follow-up, not implemented in this pass so the diff stays reviewable.
 */
import { useCallback, useRef } from "react";
import { toInstant, dayKey, minutesOfDay } from "@/lib/dates/date-utils";
import type { EventRecord } from "../types";

const SNAP_MINUTES = 15;

export function useEventDrag({
  timeZone, hourHeight, onMoveOrResize,
}: { timeZone: string; hourHeight: number; onMoveOrResize: (id: string, startAt: string, endAt: string) => void }) {
  const dragRef = useRef<{ event: EventRecord; mode: "move" | "resize"; startY: number } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, event: EventRecord, mode: "move" | "resize") => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragRef.current = { event, mode, startY: e.clientY };
      const target = e.currentTarget as HTMLElement;
      target.setPointerCapture(e.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        // Visual feedback only; the commit happens on pointerup.
      };
      const onUp = (upEvent: PointerEvent) => {
        target.removeEventListener("pointermove", onMove);
        target.removeEventListener("pointerup", onUp);
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        const deltaMinutes = Math.round(((upEvent.clientY - drag.startY) / hourHeight) * 60 / SNAP_MINUTES) * SNAP_MINUTES;
        if (deltaMinutes === 0) return;

        const startMinutes = minutesOfDay(drag.event.startAt, timeZone);
        const endMinutes = minutesOfDay(drag.event.endAt, timeZone);
        const duration = endMinutes - startMinutes;
        const day = dayKey(drag.event.startAt, timeZone);

        if (drag.mode === "resize") {
          const newEnd = Math.max(startMinutes + SNAP_MINUTES, endMinutes + deltaMinutes);
          onMoveOrResize(drag.event.id, drag.event.startAt, toInstant(day, newEnd, timeZone));
        } else {
          const newStart = Math.max(0, Math.min(1439 - duration, startMinutes + deltaMinutes));
          onMoveOrResize(
            drag.event.id,
            toInstant(day, newStart, timeZone),
            toInstant(day, newStart + duration, timeZone)
          );
        }
      };

      target.addEventListener("pointermove", onMove);
      target.addEventListener("pointerup", onUp);
    },
    [hourHeight, timeZone, onMoveOrResize]
  );

  return { onPointerDown };
}
