import { prisma } from "@/lib/prisma/client";

export const notificationRepository = {
  async listForUser(userId: string, workspaceId: string, limit = 20) {
    return prisma.notification.findMany({
      where: { userId, workspaceId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
  },

  async countUnread(userId: string, workspaceId: string) {
    return prisma.notification.count({ where: { userId, workspaceId, isRead: false } });
  },

  async markRead(id: string, userId: string) {
    return prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  },

  async markAllRead(userId: string, workspaceId: string) {
    return prisma.notification.updateMany({ where: { userId, workspaceId, isRead: false }, data: { isRead: true } });
  },

  async create(data: { userId: string; workspaceId: string; type: string; title: string; body?: string; eventId?: string }) {
    return prisma.notification.create({ data });
  },
};
