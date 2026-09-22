"use client";
/**
 * Pointer-based drag/resize with 15-minute snapping + day-column move.
 * Notebook v3 §3.3/3.4: tracks startX/startY + originDay, computes target civil day via column hit-test,
 * uses instant duration (ms) not minutesOfDay diff to handle cross-midnight.
 *
 * Fix: `onMove` had become a no-op, so an event only jumped to its new time
 * on pointer-up with no feedback while dragging. Restored a live preview —
 * translate the element while the pointer moves, snapped to the same
 * 15-minute grid the commit uses, and add/remove the existing `.ev.drag`
 * class (already styled in globals.css) for the lifted/shadowed look.
 *
 * Also removed dead code from the resize branch: it used to compute a
 * `nextDay` value and then immediately discard it by overwriting `finalEnd`
 * twice. Resize is still clamped to the end of the origin day (23:59) —
 * spilling a resize into the next day is not implemented, so the clamp is
 * now just stated plainly instead of masked by unused calculations.
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
  const dragRef = useRef<{ event: EventRecord; mode: "move" | "resize"; startX: number; startY: number; originDayKey: string; el: HTMLElement } | null>(null);

  const onPointerDown = useCallback(
    (e: React.PointerEvent, event: EventRecord, mode: "move" | "resize") => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const originDayKey = dayKey(event.startAt, timeZone);
      const el = e.currentTarget as HTMLElement;
      dragRef.current = { event, mode, startX: e.clientX, startY: e.clientY, originDayKey, el };
      el.setPointerCapture(e.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        const drag = dragRef.current;
        if (!drag) return;
        const rawDeltaY = moveEvent.clientY - drag.startY;
        const snappedDeltaY = Math.round((rawDeltaY / hourHeight) * 60 / SNAP_MINUTES) * SNAP_MINUTES * (hourHeight / 60);
        drag.el.classList.add("drag");
        if (drag.mode === "resize") {
          const currentHeight = drag.el.getBoundingClientRect().height;
          drag.el.style.height = `${Math.max(22, currentHeight + snappedDeltaY)}px`;
        } else {
          const deltaX = moveEvent.clientX - drag.startX;
          drag.el.style.transform = `translate(${deltaX}px, ${snappedDeltaY}px)`;
        }
      };

      const onUp = (upEvent: PointerEvent) => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
        const drag = dragRef.current;
        dragRef.current = null;
        if (!drag) return;
        drag.el.classList.remove("drag");
        drag.el.style.transform = "";
        drag.el.style.height = "";

        const deltaMinutes = Math.round(((upEvent.clientY - drag.startY) / hourHeight) * 60 / SNAP_MINUTES) * SNAP_MINUTES;

        // Determine target day via horizontal delta / column hit-test (Notebook v3 §3.3)
        let targetDayKey = drag.originDayKey;
        if (drag.mode === "move") {
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
          const newEnd = Math.max(startMin + SNAP_MINUTES, endMin + deltaMinutes);
          // Resizing is clamped to the end of the origin day; it does not
          // currently spill an event's end into the next day.
          const clampedEnd = Math.min(1439, newEnd);
          const finalEnd = toInstant(drag.originDayKey, clampedEnd, timeZone);
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

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
    },
    [hourHeight, timeZone, onMoveOrResize, days, gridRef]
  );

  return { onPointerDown };
}
