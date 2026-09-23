import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, formatWeek, todayStr, weekStartOf } from "@/lib/dates";
import { ensureRecurringTasks } from "@/lib/recurring";
import { TaskRow, taskRowInclude } from "@/components/TaskRow";
import { Avatar } from "@/components/Avatar";
import { UserForm } from "@/components/UserForm";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const me = await requireUser();
  const isAdmin = me.role === "ADMIN";
  const today = todayStr();
  await ensureRecurringTasks(today);
  const weekStart = weekStartOf(today);
  const weekEnd = addDays(weekStart, 6);

  const [users, tasks] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" } }),
    db.task.findMany({
      where: { OR: [{ dueDate: { gte: weekStart, lte: weekEnd } }, { completedAt: null, dueDate: { lt: weekStart } }] },
      include: taskRowInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-stone-600">Everyone's list for {formatWeek(weekStart).toLowerCase()}, plus anything still overdue.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {users.map((u) => {
          const ts = tasks.filter((t) => t.assigneeId === u.id);
          const thisWeek = ts.filter((t) => t.dueDate >= weekStart);
          const done = thisWeek.filter((t) => t.completedAt).length;
          const overdue = ts.filter((t) => !t.completedAt && t.dueDate < today).length;
          return (
            <section key={u.id} id={u.id} className="card scroll-mt-20">
              <div className="flex items-center gap-3 border-b border-stone-100 px-4 py-4">
                <Avatar user={u} size="md" />
                <div className="flex-1">
                  <p className="font-semibold">{u.name}</p>
                  <p className="text-xs text-stone-500">
                    {done}/{thisWeek.length} done this week
                    {overdue > 0 && <span className="font-semibold text-red-700"> · {overdue} overdue</span>}
                  </p>
                </div>
                {isAdmin && (
                  <Link href={`/tasks/new?assignee=${u.id}`} className="btn-ghost text-sm text-brand">+ Assign</Link>
                )}
              </div>
              {ts.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-stone-500">Nothing this week.</p>
              ) : (
                <ul className="divide-y divide-stone-100">
                  {ts.map((t) => <TaskRow key={t.id} task={t} today={today} />)}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {isAdmin && (
        <section className="card">
          <div className="card-header">
            <h2 className="card-title">Manage people</h2>
          </div>
          <ul className="divide-y divide-stone-100">
            {users.map((u) => (
              <li key={u.id} className="px-4 py-3">
                <details>
                  <summary className="flex cursor-pointer items-center gap-3">
                    <Avatar user={u} />
                    <span className="font-medium">{u.name}</span>
                    <span className="text-sm text-stone-500">{u.email}</span>
                    {u.role === "ADMIN" && <span className="pill bg-brand-soft text-brand-ink">Admin</span>}
                    {!u.emailReminders && <span className="pill bg-stone-100 text-stone-500">Emails off</span>}
                  </summary>
                  <div className="mt-4">
                    <UserForm user={u} />
                  </div>
                </details>
              </li>
            ))}
            <li className="px-4 py-3">
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-brand">+ Add someone</summary>
                <div className="mt-4">
                  <UserForm />
                </div>
              </details>
            </li>
          </ul>
        </section>
      )}
    </div>
  );
}
