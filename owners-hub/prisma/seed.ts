// First-run setup: the three owners, the Bible Study project, and its weekly
// to-dos. Runs on every server start but only does anything on an empty database.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { todayStr } from "../src/lib/dates";

const db = new PrismaClient();

async function main() {
  // Only set up people on a brand-new database, so renaming someone or changing
  // their email later never brings back a duplicate account.
  if ((await db.user.count()) > 0) {
    console.log("Seed skipped: people already exist.");
    return;
  }
  const password = process.env.SEED_PASSWORD || "change-me-now";
  const hash = await bcrypt.hash(password, 10);
  const people = [
    { key: "nathan", name: "Nathan", email: process.env.SEED_NATHAN_EMAIL || "nathan@example.com", role: "ADMIN" },
    { key: "kyler", name: "Kyler", email: process.env.SEED_KYLER_EMAIL || "kyler@example.com", role: "MEMBER" },
    { key: "isaac", name: "Isaac", email: process.env.SEED_ISAAC_EMAIL || "isaac@example.com", role: "MEMBER" },
  ];
  const ids: Record<string, string> = {};
  for (const p of people) {
    const u = await db.user.upsert({
      where: { email: p.email.toLowerCase() },
      update: {},
      create: { name: p.name, email: p.email.toLowerCase(), role: p.role, passwordHash: hash },
    });
    ids[p.key] = u.id;
  }

  const project = await db.project.upsert({
    where: { slug: "bible-study" },
    update: {},
    create: {
      slug: "bible-study",
      name: "Bible Study",
      description: "Our weekly Bible study for creators.",
      meetingDay: 4,
      meetingTime: "7:00 PM",
    },
  });

  if ((await db.recurringTask.count({ where: { projectId: project.id } })) === 0) {
    const startsOn = todayStr();
    // Day numbers: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat
    const weekly = [
      { title: "Plan this week's lesson", assignee: "nathan", day: 1, description: "Fill in the scripture, main point, outline, and discussion questions on this week's plan. Mark it Ready when it's final." },
      { title: "Outreach to new creators", assignee: "isaac", day: 1, description: "Invite new creators to this week's study. Log who you reached out to in the Outreach section of the weekly plan." },
      { title: "Create Bible study graphic", assignee: "kyler", day: 2, description: "Read the lesson + graphic brief on the weekly plan, design the graphic, and upload it to Files on that page." },
      { title: "Send GroupMe announcement", assignee: "isaac", day: 3, description: "Post the announcement with the graphic. The message draft is on the weekly plan (tap Copy message)." },
      { title: "Send GroupMe day-of reminder", assignee: "isaac", day: 4, description: "Quick reminder in GroupMe the day of the study." },
    ];
    for (const w of weekly) {
      await db.recurringTask.create({
        data: { projectId: project.id, title: w.title, description: w.description, assigneeId: ids[w.assignee], dayOfWeek: w.day, startsOn },
      });
    }
  }
  console.log(`Seeded. Sign in with any owner's email and the password "${password}" — then change it in Settings.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
