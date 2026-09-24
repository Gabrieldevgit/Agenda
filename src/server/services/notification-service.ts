import { notificationRepository } from "@/server/repositories/notification-repository";
import { assertWorkspaceMember } from "./workspace-service";

export async function listNotifications(userId: string, workspaceId: string) {
  await assertWorkspaceMember(userId, workspaceId);
  const [items, unread] = await Promise.all([
    notificationRepository.listForUser(userId, workspaceId),
    notificationRepository.countUnread(userId, workspaceId),
  ]);
  return { items, unread };
}

export async function markNotificationRead(userId: string, workspaceId: string, id: string) {
  await assertWorkspaceMember(userId, workspaceId);
  await notificationRepository.markRead(id, userId);
}

export async function markAllNotificationsRead(userId: string, workspaceId: string) {
  await assertWorkspaceMember(userId, workspaceId);
  await notificationRepository.markAllRead(userId, workspaceId);
}

export async function createNotification(
  userId: string,
  workspaceId: string,
  data: { type: string; title: string; body?: string; eventId?: string }
) {
  return notificationRepository.create({ userId, workspaceId, ...data });
}

// Helper to create reminder notifications (called by reminder service / cron)
export async function createReminderNotification(userId: string, workspaceId: string, eventId: string, title: string, minutesBefore: number) {
  return createNotification(userId, workspaceId, {
    type: "event_reminder",
    title: `Upcoming: ${title}`,
    body: `Starts in ${minutesBefore} minutes`,
    eventId,
  });
}
