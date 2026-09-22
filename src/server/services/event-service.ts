/**
 * Domain operations the UI actually calls (Construction Notebook §12).
 * The UI never imports the repository or Prisma directly — only this.
 */
import { eventRepository } from "@/server/repositories/event-repository";
import {
  assertCalendarAccess,
  assertCanCreateEvent,
  assertCanDeleteEvent,
  assertCanEditEvent,
  assertWorkspaceMember,
  assertCanWriteWorkspace,
} from "./workspace-service";
import { prisma } from "@/lib/prisma/client";
import type { Prisma } from "@prisma/client";
import { eventInputSchema, eventInputPartialSchema, moveOrResizeSchema, type EventInput } from "@/features/events/validation/event-schema";
import type { EventRecord } from "@/features/calendar/types";

/**
 * NOTE (Notebook v2 §4): Browser never imports Prisma; this service is the
 * authorization boundary. Supabase SSR session authenticates the request,
 * but Prisma queries run over a privileged pooled connection that bypasses RLS.
 * Hence every function here must explicitly assert membership/role before touching
 * the repository — RLS is secondary defense only.
 */

type EventRow = Prisma.EventGetPayload<{}>;
type EventWithCalendarRow = Prisma.EventGetPayload<{ include: { calendar: true } }>;

function toRecord(row: EventRow | EventWithCalendarRow | null): EventRecord {
  if (!row) throw new Error("NOT_FOUND: event");
  return {
    id: row.id,
    calendarId: row.calendarId,
    title: row.title,
    description: row.description ?? "",
    location: row.location ?? "",
    startAt: row.startAt.toISOString(),
    endAt: row.endAt.toISOString(),
    timezone: row.timezone,
    allDay: row.allDay,
    status: row.status as EventRecord["status"],
  };
}

export async function listEventsInRange(
  userId: string,
  workspaceId: string,
  calendarIds: string[] | undefined,
  rangeStart: Date,
  rangeEnd: Date
): Promise<EventRecord[]> {
  await assertWorkspaceMember(userId, workspaceId);
  const rows = await eventRepository.findInRange({ workspaceId, calendarIds, rangeStart, rangeEnd });
  return rows.map((row) => toRecord(row));
}

export async function createEvent(userId: string, rawInput: unknown): Promise<EventRecord> {
  const input: EventInput = eventInputSchema.parse(rawInput);
  await assertCanCreateEvent(userId, input.calendarId);
  const row = await eventRepository.create(userId, input);
  return toRecord(await eventRepository.findById(row.id));
}

export async function updateEvent(userId: string, eventId: string, rawInput: unknown): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id: eventId }, include: { calendar: true } });
  if (!existing) throw new Error("NOT_FOUND: event");
  if (existing.deletedAt) throw new Error("CONFLICT: event is deleted");
  await assertCanWriteWorkspace(userId, existing.calendar.workspaceId);
  const input = eventInputPartialSchema.parse(rawInput);
  if (input.calendarId && input.calendarId !== existing.calendarId) {
    // Notebook v2 §8: forbid cross-workspace calendar moves.
    const targetCal = await prisma.calendar.findUnique({ where: { id: input.calendarId } });
    if (!targetCal) throw new Error("NOT_FOUND: calendar");
    if (targetCal.workspaceId !== existing.calendar.workspaceId) {
      throw new Error("FORBIDDEN: cannot move event to a different workspace");
    }
    await assertCanCreateEvent(userId, input.calendarId);
  }
  await eventRepository.update(eventId, input);
  return toRecord(await eventRepository.findById(eventId));
}

/** Powers drag-to-move and resize — same authorization, narrower payload. */
export async function moveOrResizeEvent(userId: string, eventId: string, rawInput: unknown): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id: eventId }, include: { calendar: true } });
  if (!existing) throw new Error("NOT_FOUND: event");
  if (existing.deletedAt) throw new Error("CONFLICT: event is deleted");
  await assertCanWriteWorkspace(userId, existing.calendar.workspaceId);
  const input = moveOrResizeSchema.parse(rawInput);
  await eventRepository.update(eventId, input);
  return toRecord(await eventRepository.findById(eventId));
}

export async function deleteEvent(userId: string, eventId: string): Promise<void> {
  await assertCanDeleteEvent(userId, eventId);
  await eventRepository.softDelete(eventId);
}

/** Undo, within the toast window — restores the same row instead of re-creating it. */
export async function restoreEvent(userId: string, eventId: string): Promise<EventRecord> {
  const existing = await prisma.event.findUnique({ where: { id: eventId }, include: { calendar: true } });
  if (!existing) throw new Error("NOT_FOUND: event");
  // Restore must work on soft-deleted rows (deletedAt != null) and still enforce write perms.
  await assertCanWriteWorkspace(userId, existing.calendar.workspaceId);
  await eventRepository.restore(eventId);
  return toRecord(await eventRepository.findById(eventId));
}

export async function searchEvents(
  userId: string,
  workspaceId: string,
  query: string,
  calendarIds: string[] | undefined,
  rangeStart: Date,
  rangeEnd: Date
): Promise<EventRecord[]> {
  await assertWorkspaceMember(userId, workspaceId);
  const rows = await eventRepository.searchInRange({ workspaceId, calendarIds, rangeStart, rangeEnd, query });
  return rows.map((row) => toRecord(row));
}

/** Search bar's global mode — any event in the workspace, any date, not just the visible range. */
export async function searchEventsGlobal(
  userId: string,
  workspaceId: string,
  query: string,
  calendarIds: string[] | undefined,
  limit?: number
): Promise<EventRecord[]> {
  await assertWorkspaceMember(userId, workspaceId);
  const rows = await eventRepository.searchGlobal({ workspaceId, calendarIds, query, limit });
  return rows.map((row) => toRecord(row));
}
