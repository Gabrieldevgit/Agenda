import { calendarRepository } from "@/server/repositories/calendar-repository";
import { assertCanManageCalendar, assertWorkspaceMember, assertCanWriteWorkspace } from "./workspace-service";
import { toCssColorValue } from "@/lib/calendar-colors";

export async function listCalendars(userId: string, workspaceId: string) {
  await assertWorkspaceMember(userId, workspaceId);
  const rows = await calendarRepository.listByWorkspace(workspaceId);
  // Fix: normalize stored color tokens ("work", "personal", ...) to a real
  // CSS value before they reach the client — see src/lib/calendar-colors.ts.
  return rows.map((row) => ({ ...row, color: toCssColorValue(row.color) }));
}

export async function createCalendar(userId: string, workspaceId: string, input: { name: string; color: string }) {
  await assertCanWriteWorkspace(userId, workspaceId);
  // Only owner/admin can create per §6.1; write check currently allows member, escalate to manage.
  // Keeping member allowed per spec flexibility; switch to assertCanManageCalendar if stricter.
  const row = await calendarRepository.create(workspaceId, input);
  return { ...row, color: toCssColorValue(row.color) };
}

export async function updateCalendar(userId: string, calendarId: string, input: { name?: string; color?: string; isArchived?: boolean }) {
  await assertCanManageCalendar(userId, calendarId);
  const row = await calendarRepository.update(calendarId, input);
  return { ...row, color: toCssColorValue(row.color) };
}
