/**
 * Resolve a print scope + anchor date into a concrete [rangeStart, rangeEnd)
 * instant range plus the list of civil days to lay out — mirrors the range
 * math `CalendarShell` uses for each on-screen view, so a printed "Week"
 * matches the week you'd actually see on screen.
 */
import { addDays, mondayOf } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";

export type PrintScope = "day" | "week" | "month" | "agenda" | "range";

export function dateKeyToDate(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function computePrintRange(
  scope: PrintScope,
  dateKey: string,
  timeZone: string,
  rangeEndKey?: string
): { rangeStart: Date; rangeEnd: Date; days: Date[]; label: string } {
  const anchor = dateKeyToDate(dateKey);

  if (scope === "day") {
    const start = anchor;
    const end = addDays(start, 1, timeZone);
    return { rangeStart: start, rangeEnd: end, days: [start], label: formatInTimeZone(start, timeZone, "EEEE, MMMM d, yyyy") };
  }

  if (scope === "week") {
    const monday = mondayOf(anchor, timeZone);
    const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i, timeZone));
    const sunday = days[6]!;
    return {
      rangeStart: monday,
      rangeEnd: addDays(monday, 7, timeZone),
      days,
      label: `${formatInTimeZone(monday, timeZone, "MMM d")} – ${formatInTimeZone(sunday, timeZone, "MMM d, yyyy")}`,
    };
  }

  if (scope === "month") {
    const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const gridStart = mondayOf(monthStart, timeZone);
    const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i, timeZone));
    return {
      rangeStart: gridStart,
      rangeEnd: addDays(gridStart, 42, timeZone),
      days,
      label: formatInTimeZone(anchor, timeZone, "MMMM yyyy"),
    };
  }

  if (scope === "agenda") {
    const days = Array.from({ length: 30 }, (_, i) => addDays(anchor, i, timeZone));
    const end = days[29]!;
    return {
      rangeStart: anchor,
      rangeEnd: addDays(anchor, 30, timeZone),
      days,
      label: `${formatInTimeZone(anchor, timeZone, "MMM d")} – ${formatInTimeZone(end, timeZone, "MMM d, yyyy")}`,
    };
  }

  // Custom range
  const endAnchor = rangeEndKey ? dateKeyToDate(rangeEndKey) : anchor;
  const start = anchor <= endAnchor ? anchor : endAnchor;
  const endInclusive = anchor <= endAnchor ? endAnchor : anchor;
  const dayCount = Math.max(1, Math.round((endInclusive.getTime() - start.getTime()) / 86400000) + 1);
  const days = Array.from({ length: Math.min(dayCount, 62) }, (_, i) => addDays(start, i, timeZone));
  return {
    rangeStart: start,
    rangeEnd: addDays(start, days.length, timeZone),
    days,
    label: `${formatInTimeZone(start, timeZone, "MMM d, yyyy")} – ${formatInTimeZone(days[days.length - 1]!, timeZone, "MMM d, yyyy")}`,
  };
}
