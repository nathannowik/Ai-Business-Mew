import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, DAY_NAMES, dateInWeek, formatDay, formatWeek, todayStr, weekStartOf } from "@/lib/dates";
import { ensureRecurringTasks } from "@/lib/recurring";
import { TaskRow, taskRowInclude } from "@/components/TaskRow";
import { Avatar } from "@/components/Avatar";

export const metadata = { title: "Today" };

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: process.env.APP_TIMEZONE || "America/Chicago", hour: "numeric", hourCycle: "h23" }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default async function Dashboard() {
  const user = await requireUser();
  const today = todayStr();
  await ensureRecurringTasks(today);
  const thisWeek = weekStartOf(today);

  const [mine, upcoming, users, teamTasks, projects] = await Promise.all([
    db.task.findMany({
      where: { assigneeId: user.id, OR: [{ completedAt: null, dueDate: { lte: today } }, { dueDate: today }] },
      include: taskRowInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.task.findMany({
      where: { assigneeId: user.id, completedAt: null, dueDate: { gt: today, lte: addDays(today, 7) } },
      include: taskRowInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.task.findMany({
      where: { OR: [{ completedAt: null, dueDate: { lte: today } }, { dueDate: today }] },
      include: taskRowInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
    db.project.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        weeks: {
          where: { weekStart: thisWeek },
          include: { _count: { select: { attachments: true } }, tasks: { select: { completedAt: true } } },
        },
      },
    }),
  ]);

  const overdue = mine.filter((t) => t.dueDate < today);
  const dueToday = mine.filter((t) => t.dueDate === today);
  const openCount = mine.filter((t) => !t.completedAt).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-stone-500">{formatDay(today, { weekday: "long", month: "long", day: "numeric" })}</p>
          <h1 className="text-2xl font-bold">
            {greeting()}, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-stone-600">
            {openCount === 0 ? "You're all caught up for today. 🙌" : `${openCount} thing${openCount === 1 ? "" : "s"} left on your list today.`}
          </p>
        </div>
        {user.role === "ADMIN" && (
          <Link href="/tasks/new" className="btn-primary hidden md:inline-flex">
            + New task
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">My to-do list</h2>
              <span className="text-xs text-stone-500">Tap a task for details · tap the circle to check it off</span>
            </div>
            {mine.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-stone-500">Nothing due today.</p>
            ) : (
              <>
                {overdue.length > 0 && (
                  <>
                    <p className="bg-red-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-700">Overdue</p>
                    <ul className="divide-y divide-stone-100">
                      {overdue.map((t) => <TaskRow key={t.id} task={t} today={today} />)}
                    </ul>
                  </>
                )}
                {dueToday.length > 0 && (
                  <>
                    {overdue.length > 0 && <p className="bg-stone-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500">Today</p>}
                    <ul className="divide-y divide-stone-100">
                      {dueToday.map((t) => <TaskRow key={t.id} task={t} today={today} showDue={false} />)}
                    </ul>
                  </>
                )}
              </>
            )}
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Coming up · next 7 days</h2>
            </div>
            {upcoming.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-stone-500">Nothing else scheduled this week.</p>
            ) : (
              <ul className="divide-y divide-stone-100">
                {upcoming.map((t) => <TaskRow key={t.id} task={t} today={today} />)}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Team today</h2>
              <Link href="/team" className="text-xs font-medium text-brand hover:underline">Full view →</Link>
            </div>
            <ul className="divide-y divide-stone-100">
              {users.map((u) => {
                const ts = teamTasks.filter((t) => t.assigneeId === u.id);
                const done = ts.filter((t) => t.completedAt).length;
                const late = ts.filter((t) => !t.completedAt && t.dueDate < today).length;
                const pct = ts.length ? Math.round((done / ts.length) * 100) : 100;
                return (
                  <li key={u.id} className="px-4 py-3">
                    <Link href={`/team#${u.id}`} className="flex items-center gap-3">
                      <Avatar user={u} size="md" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-semibold">{u.name}{u.id === user.id && <span className="font-normal text-stone-400"> (you)</span>}</span>
                          <span className="text-stone-500">
                            {ts.length ? `${done}/${ts.length}` : "—"}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-stone-100">
                          <div className={`h-full rounded-full ${late ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
                        </div>
                        {late > 0 && <p className="mt-1 text-xs font-medium text-red-700">{late} overdue</p>}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card">
            <div className="card-header">
              <h2 className="card-title">What we're involved in</h2>
            </div>
            <ul className="divide-y divide-stone-100">
              {projects.map((p) => {
                const week = p.weeks[0];
                const total = week?.tasks.length ?? 0;
                const done = week?.tasks.filter((t) => t.completedAt).length ?? 0;
                return (
                  <li key={p.id} className="space-y-2 px-4 py-4">
                    <div className="flex items-center justify-between">
                      <Link href={`/projects/${p.slug}`} className="font-semibold hover:underline">📖 {p.name}</Link>
                      <span className="text-xs text-stone-500">
                        {DAY_NAMES[p.meetingDay]}s{p.meetingTime ? ` · ${p.meetingTime}` : ""}
                      </span>
                    </div>
                    {week && (
                      <Link href={`/projects/${p.slug}/weeks/${week.id}`} className="block rounded-xl bg-brand-soft px-3 py-2.5 text-sm hover:bg-indigo-100">
                        <span className="font-semibold text-brand-ink">{formatWeek(thisWeek)} →</span>
                        <span className="mt-0.5 block text-xs text-stone-600">
                          {week.topic || "Lesson topic not set yet"} · {done}/{total} tasks · {week._count.attachments} file{week._count.attachments === 1 ? "" : "s"}
                        </span>
                        <span className="mt-0.5 block text-xs text-stone-500">Meets {formatDay(dateInWeek(thisWeek, p.meetingDay))}</span>
                      </Link>
                    )}
                  </li>
                );
              })}
              <li className="px-4 py-3 text-xs text-stone-400">More areas of the business coming soon.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
