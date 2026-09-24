import { describe, it, expect } from "vitest";
import { layoutDay } from "@/features/calendar/lib/layout-events";
import type { EventRecord } from "@/features/calendar/types";

const TZ = "America/Toronto";
function ev(id: string, startHour: number, endHour: number): EventRecord {
  const day = "2026-09-21";
  return {
    id, calendarId: "work", title: id, description: "", location: "",
    startAt: new Date(`${day}T${String(startHour).padStart(2, "0")}:00:00-04:00`).toISOString(),
    endAt: new Date(`${day}T${String(endHour).padStart(2, "0")}:00:00-04:00`).toISOString(),
    timezone: TZ, allDay: false, status: "confirmed",
    labels: [], priority: 2,
  };
}

describe("layoutDay", () => {
  it("gives non-overlapping events a single full-width column", () => {
    const result = layoutDay([ev("a", 9, 10), ev("b", 11, 12)], TZ);
    expect(result.every((r) => r.columnCount === 1)).toBe(true);
  });

  it("splits overlapping events into side-by-side columns", () => {
    const result = layoutDay([ev("a", 9, 11), ev("b", 10, 12)], TZ);
    const a = result.find((r) => r.event.id === "a")!;
    const b = result.find((r) => r.event.id === "b")!;
    expect(a.columnCount).toBe(2);
    expect(b.columnCount).toBe(2);
    expect(a.column).not.toBe(b.column);
  });

  it("reuses a freed column once an earlier event ends", () => {
    const result = layoutDay([ev("a", 9, 10), ev("b", 9, 11), ev("c", 10, 12)], TZ);
    const a = result.find((r) => r.event.id === "a")!;
    const c = result.find((r) => r.event.id === "c")!;
    expect(a.column).toBe(c.column);
  });
});
