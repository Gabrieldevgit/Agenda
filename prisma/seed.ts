/**
 * Minimal dev seed: one user, one default workspace, four calendars —
 * matches the prototype's seed() so local data looks the same during
 * the migration. Run with `npm run prisma:seed`.
 */
import { PrismaClient } from "@prisma/client";
import { fromZonedTime } from "date-fns-tz";

const prisma = new PrismaClient();
const TZ = "America/Toronto";

function mondayOf(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return new Date(x.setDate(x.getDate() - ((x.getDay() + 6) % 7)));
}
function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

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
  const calendars: Record<string, string> = {};
  for (const cal of calendarSeeds) {
    const id = `${workspace.id}-${cal.color}`;
    await prisma.calendar.upsert({
      where: { id },
      update: {},
      create: { id, workspaceId: workspace.id, ...cal },
    });
    calendars[cal.color] = id;
  }

  // Clear existing demo events
  await prisma.event.deleteMany({ where: { calendarId: { in: Object.values(calendars) } } });

  // Prototype parity: 19 events Mon-Sun + next week (same as tempo-agenda.html seed())
  const mon = mondayOf(new Date());
  const t = (h: number, m = 0) => h * 60 + m;
  const toInstant = (dateStr: string, minutes: number) => {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const local = new Date(y!, mo! - 1, d!, Math.floor(minutes / 60), minutes % 60, 0, 0);
    return fromZonedTime(local, TZ);
  };
  type SeedEv = { offset: number; cal: string; title: string; s: number; e: number; loc?: string; allDay?: boolean };
  const seed: SeedEv[] = [
    { offset: 0, cal: "work", title: "Team standup", s: t(9, 30), e: t(9, 45), loc: "Video call" },
    { offset: 0, cal: "work", title: "Design review", s: t(11), e: t(12), loc: "Room 4B" },
    { offset: 0, cal: "work", title: "1:1 with Sam", s: t(11, 30), e: t(12, 15), loc: "Walk and talk" },
    { offset: 0, cal: "personal", title: "Lunch with Ana", s: t(12, 45), e: t(14), loc: "Café Lume" },
    { offset: 0, cal: "health", title: "Strength session", s: t(18), e: t(19), loc: "Gym" },
    { offset: 1, cal: "work", title: "Deep work: proposal", s: t(9), e: t(11, 30) },
    { offset: 1, cal: "study", title: "Statistics, chapter 6", s: t(14), e: t(15, 30), loc: "Library" },
    { offset: 2, cal: "work", title: "Client call", s: t(10), e: t(11) },
    { offset: 2, cal: "personal", title: "Book club", s: t(19), e: t(21), loc: "Rosa's place" },
    { offset: 3, cal: "work", title: "Sprint planning", s: t(10), e: t(11, 30) },
    { offset: 3, cal: "study", title: "Spanish class", s: t(17, 30), e: t(18, 30) },
    { offset: 4, cal: "work", title: "Weekly review", s: t(16), e: t(17) },
    { offset: 4, cal: "personal", title: "Dinner at Marco's", s: t(20), e: t(22) },
    { offset: 5, cal: "health", title: "Long run", s: t(7, 30), e: t(8, 30), loc: "River path" },
    { offset: 5, cal: "personal", title: "Farmers market", s: t(9, 30), e: t(11) },
    { offset: 6, cal: "personal", title: "Mom's birthday", s: 0, e: 0, allDay: true },
    { offset: 7, cal: "work", title: "Quarterly planning", s: t(9), e: t(12) },
    { offset: 8, cal: "study", title: "Study group", s: t(18), e: t(19, 30) },
    { offset: 9, cal: "health", title: "Physio session", s: t(8, 30), e: t(9, 15) },
  ];

  for (const ev of seed) {
    const dateStr = ymd(addDays(mon, ev.offset));
    const startAt = ev.allDay ? fromZonedTime(new Date(`${dateStr}T00:00:00`), TZ) : toInstant(dateStr, ev.s);
    const endAt = ev.allDay ? fromZonedTime(new Date(`${dateStr}T00:00:00`), TZ) : toInstant(dateStr, ev.e);
    await prisma.event.create({
      data: {
        calendarId: calendars[ev.cal]!,
        createdById: user.id,
        title: ev.title,
        description: "",
        location: ev.loc ?? "",
        startAt,
        endAt,
        timezone: TZ,
        allDay: !!ev.allDay,
        status: "confirmed",
      },
    });
  }
  console.log(`Seeded ${seed.length} prototype events for ${ymd(mon)} week`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
