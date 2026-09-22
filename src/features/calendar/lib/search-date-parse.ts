/**
 * Lightweight natural-language date parsing for the search bar's "Days"
 * results (Notebook: search should cover events *and* days). Deliberately
 * small and dependency-free — this is a "did you mean this day?" helper,
 * not a full NLP date parser. Returns civil-day keys (yyyy-MM-dd) in the
 * given timeZone, which the caller resolves against `dayKey`/`addDays`.
 */
import { addDays, mondayOf } from "@/lib/dates/date-utils";
import { formatInTimeZone } from "date-fns-tz";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

export interface DateMatch {
  dateKey: string; // yyyy-MM-dd
  label: string; // human label, e.g. "Monday, September 28"
}

function toDateMatch(date: Date, timeZone: string): DateMatch {
  return {
    dateKey: formatInTimeZone(date, timeZone, "yyyy-MM-dd"),
    label: formatInTimeZone(date, timeZone, "EEEE, MMMM d, yyyy"),
  };
}

/** Parse `raw` against `today` (in `timeZone`). Returns 0-1 best matches. */
export function parseDateQuery(raw: string, timeZone: string, today: Date = new Date()): DateMatch[] {
  const q = raw.trim().toLowerCase();
  if (q.length < 3) return [];

  // "today" / "tomorrow" / "yesterday"
  if (q === "today") return [toDateMatch(today, timeZone)];
  if (q === "tomorrow") return [toDateMatch(addDays(today, 1, timeZone), timeZone)];
  if (q === "yesterday") return [toDateMatch(addDays(today, -1, timeZone), timeZone)];

  // ISO "yyyy-MM-dd" or "yyyy/MM/dd"
  const iso = q.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return [toDateMatch(dt, timeZone)];
  }

  // "MM/dd" or "MM/dd/yyyy"
  const slash = q.match(/^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/);
  if (slash) {
    const [, m, d, y] = slash;
    const year = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : today.getFullYear();
    const dt = new Date(year, Number(m) - 1, Number(d));
    if (!Number.isNaN(dt.getTime())) return [toDateMatch(dt, timeZone)];
  }

  // Weekday name, optionally prefixed "next"/"last": "monday", "next friday"
  const wd = q.match(/^(next |last )?(sun|mon|tue|wed|thu|fri|sat)[a-z]*$/);
  if (wd) {
    const target = WEEKDAYS.findIndex((w) => w.startsWith(wd[2]!));
    if (target >= 0) {
      const monday = mondayOf(today, timeZone);
      const todayDow = (target - 1 + 7) % 7; // Mon=0 offset from monday
      let candidate = addDays(monday, todayDow, timeZone);
      const modifier = wd[1]?.trim();
      if (modifier === "next" || (!modifier && candidate <= today)) {
        // If it's today or already passed this week (or explicitly "next"), roll to next week.
        if (candidate <= today || modifier === "next") candidate = addDays(candidate, 7, timeZone);
      }
      if (modifier === "last") candidate = addDays(candidate, -7, timeZone);
      return [toDateMatch(candidate, timeZone)];
    }
  }

  // "September 28", "sep 28", "28 september", optionally with a year
  const monthDay = q.match(/^([a-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?$/)
    ?? q.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+([a-z]+)\.?(?:,?\s*(\d{4}))?$/);
  if (monthDay) {
    const isDayFirst = /^\d/.test(monthDay[1]!);
    const monthWord = (isDayFirst ? monthDay[2] : monthDay[1])!;
    const dayNum = Number(isDayFirst ? monthDay[1] : monthDay[2]);
    const yearStr = monthDay[3];
    const mi = MONTHS.findIndex((m) => m.startsWith(monthWord));
    if (mi >= 0 && dayNum >= 1 && dayNum <= 31) {
      const year = yearStr ? Number(yearStr) : today.getFullYear();
      const dt = new Date(year, mi, dayNum);
      if (!Number.isNaN(dt.getTime())) return [toDateMatch(dt, timeZone)];
    }
  }

  return [];
}
