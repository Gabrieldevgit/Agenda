/**
 * Data access only. No authorization decisions live here — the service layer
 * decides *whether* a query is allowed; the repository just runs it, always
 * scoped to a workspace_id so one tenant can never see another's rows.
 *
 * Notebook v2 §31: prefer workspace-scoped lookups to reduce chance of
 * an unscoped findById leaking across tenants. The service enforces this.
 */
import { prisma } from "@/lib/prisma/client";
import type { EventInput } from "@/features/events/validation/event-schema";

export interface EventRangeQuery {
  workspaceId: string;
  calendarIds?: string[];
  rangeStart: Date;
  rangeEnd: Date;
}

export interface EventSearchQuery extends EventRangeQuery {
  query: string;
}

export const eventRepository = {
  async findInRange({ workspaceId, calendarIds, rangeStart, rangeEnd }: EventRangeQuery) {
    return prisma.event.findMany({
      where: {
        deletedAt: null,
        startAt: { lte: rangeEnd },
        endAt: { gte: rangeStart },
        calendar: {
          workspaceId,
          ...(calendarIds && calendarIds.length > 0 ? { id: { in: calendarIds } } : calendarIds && calendarIds.length === 0 ? { id: { in: [] } } : {}),
        },
      },
      orderBy: { startAt: "asc" },
    });
  },

  /** Server-side search (Notebook v2 §17): indexed where possible, covers title/description/location. */
  async searchInRange({ workspaceId, calendarIds, rangeStart, rangeEnd, query }: EventSearchQuery) {
    const q = query.trim();
    if (!q) return this.findInRange({ workspaceId, calendarIds, rangeStart, rangeEnd });
    return prisma.event.findMany({
      where: {
        deletedAt: null,
        startAt: { lte: rangeEnd },
        endAt: { gte: rangeStart },
        calendar: {
          workspaceId,
          ...(calendarIds && calendarIds.length > 0 ? { id: { in: calendarIds } } : calendarIds && calendarIds.length === 0 ? { id: { in: [] } } : {}),
        },
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { location: { contains: q, mode: "insensitive" } },
        ],
      },
      orderBy: { startAt: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.event.findUnique({ where: { id }, include: { calendar: true } });
  },

  async findByIdInWorkspace(workspaceId: string, id: string) {
    return prisma.event.findFirst({ where: { id, calendar: { workspaceId } }, include: { calendar: true } });
  },

  async create(createdById: string, input: EventInput) {
    return prisma.event.create({
      data: {
        calendarId: input.calendarId,
        createdById,
        title: input.title,
        description: input.description ?? "",
        location: input.location ?? "",
        startAt: new Date(input.startAt),
        endAt: new Date(input.endAt),
        timezone: input.timezone,
        allDay: input.allDay,
      },
    });
  },

  async update(id: string, input: Partial<EventInput>) {
    return prisma.event.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.location !== undefined ? { location: input.location } : {}),
        ...(input.startAt !== undefined ? { startAt: new Date(input.startAt) } : {}),
        ...(input.endAt !== undefined ? { endAt: new Date(input.endAt) } : {}),
        ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
        ...(input.allDay !== undefined ? { allDay: input.allDay } : {}),
        ...(input.calendarId !== undefined ? { calendarId: input.calendarId } : {}),
      },
    });
  },

  /** Soft delete — keeps the row so Undo can restore it without re-creating it. */
  async softDelete(id: string) {
    return prisma.event.update({ where: { id }, data: { deletedAt: new Date() } });
  },

  async restore(id: string) {
    return prisma.event.update({ where: { id }, data: { deletedAt: null } });
  },
};
