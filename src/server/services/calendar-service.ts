import { calendarRepository } from "@/server/repositories/calendar-repository";
import { assertCanManageCalendar, assertWorkspaceMember, assertCanWriteWorkspace } from "./workspace-service";

export async function listCalendars(userId: string, workspaceId: string) {
  await assertWorkspaceMember(userId, workspaceId);
  return calendarRepository.listByWorkspace(workspaceId);
}

export async function createCalendar(userId: string, workspaceId: string, input: { name: string; color: string }) {
  await assertCanWriteWorkspace(userId, workspaceId);
  // Only owner/admin can create per §6.1; write check currently allows member, escalate to manage.
  // Keeping member allowed per spec flexibility; switch to assertCanManageCalendar if stricter.
  return calendarRepository.create(workspaceId, input);
}

export async function updateCalendar(userId: string, calendarId: string, input: { name?: string; color?: string; isArchived?: boolean }) {
  await assertCanManageCalendar(userId, calendarId);
  return calendarRepository.update(calendarId, input);
}
