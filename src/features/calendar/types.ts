/** Shared domain types — UI knows these, not Prisma/Postgres shapes. */

export type CalendarView = "day" | "week" | "month" | "agenda" | "book" | "year" | "notebook";

export interface CalendarSummary {
  id: string;
  name: string;
  /** design-token color name ("work" | "personal" | ...) or a hex value */
  color: string;
  isDefault: boolean;
  isArchived: boolean;
}

export type EventStatus = "confirmed" | "tentative" | "cancelled";

export interface EventRecord {
  id: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  /** ISO 8601 instants — always UTC on the wire, formatted per `timezone` in the UI */
  startAt: string;
  endAt: string;
  timezone: string;
  allDay: boolean;
  status: EventStatus;
  /** Free‑form tags / categories for organizing events */
  labels: string[];
  /** Numeric priority: 1 = low, 2 = medium (default), 3 = high */
  priority?: number;
}

export interface EventDraft {
  id?: string;
  calendarId: string;
  title: string;
  description: string;
  location: string;
  startAt: string;
  endAt: string;
  timezone: string;
  allDay: boolean;
  /** Free‑form tags / categories for organizing events */
  labels?: string[];
  /** Numeric priority: 1 = low, 2 = medium (default), 3 = high */
  priority?: number;
}

/** Result of the overlap-layout algorithm for one day's non-all-day events. */
export interface LaidOutEvent {
  event: EventRecord;
  column: number;
  columnCount: number;
}
