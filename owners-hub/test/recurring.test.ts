import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";

const dbFile = path.resolve(__dirname, "recurring-test.db");
process.env.DATABASE_URL = `file:${dbFile}`;

let db: typeof import("@/lib/db").db;
let rec: typeof import("@/lib/recurring");

beforeAll(async () => {
  rmSync(dbFile, { force: true });
  execSync("npx prisma migrate deploy", { cwd: path.resolve(__dirname, ".."), env: process.env, stdio: "ignore" });
  db = (await import("@/lib/db")).db;
  rec = await import("@/lib/recurring");
});

describe("recurring weekly to-dos", () => {
  it("creates this week's and next week's tasks exactly once, linked to the weekly page", async () => {
    const u = await db.user.create({ data: { name: "Kyler", email: "k@test.dev", passwordHash: "x" } });
    const p = await db.project.create({ data: { slug: "bs", name: "Bible Study" } });
    const t = await db.recurringTask.create({
      data: { projectId: p.id, title: "Graphic", assigneeId: u.id, dayOfWeek: 2, startsOn: "2026-09-21" },
    });

    await rec.ensureRecurringTasks("2026-09-23", { force: true });
    await rec.ensureRecurringTasks("2026-09-23", { force: true }); // idempotent

    const tasks = await db.task.findMany({ where: { recurringId: t.id }, include: { week: true }, orderBy: { dueDate: "asc" } });
    expect(tasks.map((x) => x.dueDate)).toEqual(["2026-09-22", "2026-09-29"]);
    expect(tasks.map((x) => x.week?.weekStart)).toEqual(["2026-09-21", "2026-09-28"]);
    expect(tasks.every((x) => x.assigneeId === u.id)).toBe(true);
  });

  it("skips days before the template started", async () => {
    const u = await db.user.findFirstOrThrow();
    const p = await db.project.findFirstOrThrow();
    const t = await db.recurringTask.create({
      data: { projectId: p.id, title: "Late add", assigneeId: u.id, dayOfWeek: 1, startsOn: "2026-09-23" },
    });
    await rec.ensureRecurringTasks("2026-09-23", { force: true });
    const tasks = await db.task.findMany({ where: { recurringId: t.id } });
    expect(tasks.map((x) => x.dueDate)).toEqual(["2026-09-28"]);
  });

  it("pushes edits to upcoming open tasks but leaves completed ones alone", async () => {
    const other = await db.user.create({ data: { name: "Isaac", email: "i@test.dev", passwordHash: "x" } });
    const t = await db.recurringTask.findFirstOrThrow({ where: { title: "Graphic" } });
    const [thisWeek] = await db.task.findMany({ where: { recurringId: t.id }, orderBy: { dueDate: "asc" } });
    await db.task.update({ where: { id: thisWeek.id }, data: { completedAt: new Date() } });

    await db.recurringTask.update({ where: { id: t.id }, data: { assigneeId: other.id, dayOfWeek: 4 } });
    await rec.syncUpcomingFromTemplate(t.id, "2026-09-23");

    const tasks = await db.task.findMany({ where: { recurringId: t.id }, orderBy: { dueDate: "asc" } });
    const done = tasks.find((x) => x.id === thisWeek.id)!;
    expect(done.dueDate).toBe("2026-09-22"); // untouched
    const open = tasks.filter((x) => !x.completedAt);
    expect(open.map((x) => [x.dueDate, x.assigneeId])).toEqual([["2026-10-01", other.id]]);
  });

  it("pausing removes upcoming open tasks", async () => {
    const t = await db.recurringTask.findFirstOrThrow({ where: { title: "Graphic" } });
    await db.recurringTask.update({ where: { id: t.id }, data: { active: false } });
    await rec.syncUpcomingFromTemplate(t.id, "2026-09-23");
    const open = await db.task.findMany({ where: { recurringId: t.id, completedAt: null } });
    expect(open).toHaveLength(0);
  });
});
