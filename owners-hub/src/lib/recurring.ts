// Weekly task generation. Idempotent: safe to call on every page load and from
// the reminder scheduler. Makes sure this week's and next week's lesson pages
// and recurring to-dos exist.
import { db } from "./db";
import { addDays, dateInWeek, todayStr, weekStartOf } from "./dates";

const WEEKS_AHEAD = 1;

export async function ensureWeek(projectId: string, weekStart: string) {
  return db.lessonWeek.upsert({
    where: { projectId_weekStart: { projectId, weekStart } },
    update: {},
    create: { projectId, weekStart },
  });
}

let lastRunKey = "";

export async function ensureRecurringTasks(today: string = todayStr(), { force = false } = {}) {
  // Cheap guard so a busy dashboard doesn't hit the DB with upserts every request.
  const key = `${today}:${Math.floor(Date.now() / 60_000)}`;
  if (!force && key === lastRunKey) return;
  lastRunKey = key;

  const thisWeek = weekStartOf(today);
  const weeks = Array.from({ length: WEEKS_AHEAD + 1 }, (_, i) => addDays(thisWeek, i * 7));

  const projects = await db.project.findMany({ select: { id: true } });
  for (const p of projects) for (const w of weeks) await ensureWeek(p.id, w);

  const templates = await db.recurringTask.findMany({ where: { active: true } });
  for (const t of templates) {
    for (const w of weeks) {
      const dueDate = dateInWeek(w, t.dayOfWeek);
      if (dueDate < t.startsOn) continue;
      const week = await ensureWeek(t.projectId, w);
      // One copy per week — even if the day changed after this week's copy was made.
      const exists = await db.task.findFirst({
        where: { recurringId: t.id, OR: [{ weekId: week.id }, { dueDate }] },
        select: { id: true },
      });
      if (exists) continue;
      await db.task
        .create({
          data: {
            title: t.title,
            description: t.description,
            dueDate,
            assigneeId: t.assigneeId,
            projectId: t.projectId,
            weekId: week.id,
            recurringId: t.id,
          },
        })
        .catch(() => {
          /* created concurrently by another request — fine */
        });
    }
  }
}

/** Push a template edit onto its not-yet-done upcoming tasks. */
export async function syncUpcomingFromTemplate(recurringId: string, today: string = todayStr()) {
  const t = await db.recurringTask.findUnique({ where: { id: recurringId } });
  if (!t) return;
  const upcoming = await db.task.findMany({
    where: { recurringId, completedAt: null, dueDate: { gte: today } },
    include: { week: true },
  });
  for (const task of upcoming) {
    if (!t.active) {
      await db.task.delete({ where: { id: task.id } });
      continue;
    }
    const weekStart = task.week?.weekStart ?? weekStartOf(task.dueDate);
    const dueDate = dateInWeek(weekStart, t.dayOfWeek);
    if (dueDate < today) {
      // Moved to a day that already passed this week — let generation handle next week.
      await db.task.delete({ where: { id: task.id } });
      continue;
    }
    await db.task.update({
      where: { id: task.id },
      data: { title: t.title, description: t.description, assigneeId: t.assigneeId, dueDate },
    });
  }
  lastRunKey = "";
  await ensureRecurringTasks(today, { force: true });
}
