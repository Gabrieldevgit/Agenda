/**
 * Minimal dev seed: one user, one default workspace, four calendars —
 * matches the prototype's seed() so local data looks the same during
 * the migration. Run with `npm run prisma:seed`.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.userProfile.upsert({
    where: { id: "seed-user" },
    update: {},
    create: { id: "seed-user", displayName: "Demo User", defaultTimezone: "America/Toronto" },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Workspace", slug: "demo", ownerId: user.id },
  });

  await prisma.membership.upsert({
    where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
    update: {},
    create: { workspaceId: workspace.id, userId: user.id, role: "owner" },
  });

  const calendarSeeds = [
    { name: "Work", color: "work", isDefault: true },
    { name: "Personal", color: "personal", isDefault: false },
    { name: "Study", color: "study", isDefault: false },
    { name: "Health", color: "health", isDefault: false },
  ];
  for (const cal of calendarSeeds) {
    await prisma.calendar.upsert({
      where: { id: `${workspace.id}-${cal.color}` },
      update: {},
      create: { id: `${workspace.id}-${cal.color}`, workspaceId: workspace.id, ...cal },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
