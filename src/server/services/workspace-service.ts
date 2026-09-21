import { prisma } from "@/lib/prisma/client";

/**
 * Every mutation is authorized against workspace membership
 * (Construction Notebook §30 rule 4, Notebook v2 §§6-9).
 *
 * IMPORTANT ARCHITECTURAL CORRECTION (Notebook v2 §3-4):
 * The Supabase SSR client (`createSupabaseServerClient().auth.getUser()`) only
 * authenticates the HTTP request — it does NOT make the subsequent Prisma query
 * run under that user's Supabase RLS identity. Prisma uses its own pooled
 * DATABASE_URL connection which bypasses RLS. Therefore this service layer is the
 * primary authorization boundary for all Prisma reads/writes; RLS remains defense-
 * in-depth for any data exposed via Supabase Data API directly.
 */

export type MembershipRole = "owner" | "admin" | "member" | "viewer";

// Central permission matrix (Notebook v2 §6.1)
const CAN_WRITE: MembershipRole[] = ["owner", "admin", "member"];
const CAN_MANAGE_CALENDAR: MembershipRole[] = ["owner", "admin"];
const CAN_MANAGE_MEMBERS: MembershipRole[] = ["owner", "admin"];

export async function assertWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await prisma.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) {
    throw new Error("FORBIDDEN: not a member of this workspace");
  }
  return membership;
}

export async function assertCanReadWorkspace(userId: string, workspaceId: string) {
  return assertWorkspaceMember(userId, workspaceId);
}

export async function assertCanWriteWorkspace(userId: string, workspaceId: string) {
  const m = await assertWorkspaceMember(userId, workspaceId);
  if (!(CAN_WRITE as string[]).includes(m.role)) {
    throw new Error("FORBIDDEN: viewer cannot mutate");
  }
  return m;
}

export async function assertCalendarAccess(userId: string, calendarId: string) {
  const calendar = await prisma.calendar.findUnique({ where: { id: calendarId } });
  if (!calendar) throw new Error("NOT_FOUND: calendar");
  await assertWorkspaceMember(userId, calendar.workspaceId);
  return calendar;
}

export async function assertCanCreateEvent(userId: string, calendarId: string) {
  const cal = await assertCalendarAccess(userId, calendarId);
  await assertCanWriteWorkspace(userId, cal.workspaceId);
  return cal;
}

export async function assertCanEditEvent(userId: string, eventId: string) {
  const event = await prisma.event.findUnique({ where: { id: eventId }, include: { calendar: true } });
  if (!event) throw new Error("NOT_FOUND: event");
  if (event.deletedAt) throw new Error("CONFLICT: event is deleted");
  await assertCanWriteWorkspace(userId, event.calendar.workspaceId);
  return event;
}

export async function assertCanDeleteEvent(userId: string, eventId: string) {
  return assertCanEditEvent(userId, eventId);
}

export async function assertCanManageCalendar(userId: string, calendarId: string) {
  const cal = await assertCalendarAccess(userId, calendarId);
  const m = await assertWorkspaceMember(userId, cal.workspaceId);
  if (!(CAN_MANAGE_CALENDAR as string[]).includes(m.role)) {
    throw new Error("FORBIDDEN: cannot manage calendars");
  }
  return cal;
}

export async function assertCanManageMembers(userId: string, workspaceId: string) {
  const m = await assertWorkspaceMember(userId, workspaceId);
  if (!(CAN_MANAGE_MEMBERS as string[]).includes(m.role)) {
    throw new Error("FORBIDDEN: cannot manage members");
  }
  return m;
}
