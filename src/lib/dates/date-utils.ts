/**
 * Timezone-aware date helpers (Construction Notebook §14 + Notebook v2 §25-26).
 * Storage/wire format is always UTC ISO; display always goes through
 * `formatInTimeZone` so a user's local clock is never assumed.
 * Civil dates for all-day events are handled as yyyy-MM-dd in the event's
 * timezone, not as midnight UTC.
 */
import { addDays as fnsAddDays, addMonths as fnsAddMonths, startOfDay, startOfMonth } from "date-fns";
import { formatInTimeZone, toZonedTime, fromZonedTime } from "date-fns-tz";

export function mondayOf(date: Date, timeZone: string): Date {
  const zoned = toZonedTime(date, timeZone);
  const day = (zoned.getDay() + 6) % 7; // Mon=0..Sun=6
  return startOfDay(fnsAddDays(zoned, -day));
}

export function addDays(date: Date, amount: number): Date {
  return fnsAddDays(date, amount);
}

export function addMonths(date: Date, amount: number, timeZone: string): Date {
  // Calendar-month navigation: interpret anchor in its timezone, shift month, reconvert.
  const zoned = toZonedTime(date, timeZone);
  const shifted = fnsAddMonths(zoned, amount);
  // Return as a UTC anchor representing the same civil month start.
  return fromZonedTime(startOfDay(shifted), timeZone);
}

export function startOfMonthInZone(date: Date, timeZone: string): Date {
  const zoned = toZonedTime(date, timeZone);
  return fromZonedTime(startOfDay(startOfMonth(zoned)), timeZone);
}

/** Minutes since local midnight, in `timeZone`, for a UTC instant. */
export function minutesOfDay(isoInstant: string, timeZone: string): number {
  const zoned = toZonedTime(new Date(isoInstant), timeZone);
  return zoned.getHours() * 60 + zoned.getMinutes();
}

/** Combine a calendar day + minutes-of-day (in `timeZone`) into a UTC instant. */
export function toInstant(dayIso: string, minutes: number, timeZone: string): string {
  const [y, m, d] = dayIso.split("-").map(Number);
  const local = new Date((y ?? 1970), ((m ?? 1) - 1), d ?? 1, Math.floor(minutes / 60), minutes % 60);
  return fromZonedTime(local, timeZone).toISOString();
}

export function dayKey(isoInstant: string, timeZone: string): string {
  return formatInTimeZone(new Date(isoInstant), timeZone, "yyyy-MM-dd");
}

export function formatClock(isoInstant: string, timeZone: string): string {
  return formatInTimeZone(new Date(isoInstant), timeZone, "h:mm a");
}

export function formatRange(startIso: string, endIso: string, timeZone: string): string {
  return `${formatClock(startIso, timeZone)} – ${formatClock(endIso, timeZone)}`;
}

export function titleForView(anchor: Date, view: "day" | "week" | "month" | "agenda", timeZone: string): string {
  if (view === "day") {
    return formatInTimeZone(anchor, timeZone, "EEEE, MMMM d, yyyy");
  }
  if (view === "month") {
    return formatInTimeZone(anchor, timeZone, "MMMM yyyy");
  }
  if (view === "week" || view === "agenda") {
    const monday = mondayOf(anchor, timeZone);
    const sunday = addDays(monday, 6);
    const sameMonth = formatInTimeZone(monday, timeZone, "MMM") === formatInTimeZone(sunday, timeZone, "MMM");
    if (sameMonth) {
      return `${formatInTimeZone(monday, timeZone, "MMM d")} – ${formatInTimeZone(sunday, timeZone, "d, yyyy")}`;
    }
    return `${formatInTimeZone(monday, timeZone, "MMM d")} – ${formatInTimeZone(sunday, timeZone, "MMM d, yyyy")}`;
  }
  return formatInTimeZone(anchor, timeZone, "MMMM yyyy");
}

/** Split an event that spans civil days into per-day display segments (Notebook v2 §24). */
export function segmentEventByDay(event: { startAt: string; endAt: string }, timeZone: string): { dayKey: string; startMinutes: number; endMinutes: number }[] {
  const start = new Date(event.startAt);
  const end = new Date(event.endAt);
  if (end <= start) return [{ dayKey: dayKey(event.startAt, timeZone), startMinutes: 0, endMinutes: 15 }];
  const segments: { dayKey: string; startMinutes: number; endMinutes: number }[] = [];
  // Walk civil days in event timezone.
  let cursorKey = dayKey(event.startAt, timeZone);
  let cursorDate = toZonedTime(start, timeZone);
  const endZoned = toZonedTime(end, timeZone);
  // Safety cap for absurd ranges.
  for (let i = 0; i < 60; i++) {
    const isFirst = i === 0;
    const isLast = cursorKey === dayKey(event.endAt, timeZone);
    const startMin = isFirst ? cursorDate.getHours() * 60 + cursorDate.getMinutes() : 0;
    const endMin = isLast ? endZoned.getHours() * 60 + endZoned.getMinutes() : 1440;
    if (endMin > startMin) segments.push({ dayKey: cursorKey, startMinutes: startMin, endMinutes: endMin });
    if (isLast) break;
    // Advance to next civil day.
    const nextLocal = new Date(cursorDate);
    nextLocal.setDate(nextLocal.getDate() + 1);
    nextLocal.setHours(0, 0, 0, 0);
    cursorDate = nextLocal;
    cursorKey = formatInTimeZone(fromZonedTime(nextLocal, timeZone), timeZone, "yyyy-MM-dd");
    // If we've moved past end, break.
    if (fromZonedTime(nextLocal, timeZone) >= end) break;
  }
  return segments.length ? segments : [{ dayKey: dayKey(event.startAt, timeZone), startMinutes: 0, endMinutes: 1440 }];
}
