import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { addDays, DAY_NAMES, dateInWeek, formatDay, formatWeek, todayStr, weekStartOf } from "@/lib/dates";
import { ensureRecurringTasks } from "@/lib/recurring";
import { openWeek, setRecurringActive, updateProject } from "@/app/actions";
import { Avatar } from "@/components/Avatar";
import { RecurringForm } from "@/components/RecurringForm";
import { StateForm, SubmitButton } from "@/components/forms";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await db.project.findUnique({ where: { slug: (await params).slug }, select: { name: true } });
  return { title: p?.name ?? "Project" };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const isAdmin = user.role === "ADMIN";
  const today = todayStr();
  await ensureRecurringTasks(today);
  const thisWeek = weekStartOf(today);

  const project = await db.project.findUnique({
    where: { slug: (await params).slug },
    include: {
      weeks: {
        orderBy: { weekStart: "desc" },
        take: 16,
        include: { tasks: { select: { completedAt: true } }, _count: { select: { attachments: true } } },
      },
      recurringTasks: { include: { assignee: true }, orderBy: [{ active: "desc" }, { dayOfWeek: "asc" }] },
    },
  });
  if (!project) notFound();
  const users = await db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } });

  const upcoming = project.weeks.filter((w) => w.weekStart >= thisWeek).reverse();
  const past = project.weeks.filter((w) => w.weekStart < thisWeek);
  // Sort recurring by day in Monday-first order.
  const recurring = [...project.recurringTasks].sort((a, b) => Number(b.active) - Number(a.active) || ((a.dayOfWeek + 6) % 7) - ((b.dayOfWeek + 6) % 7));

  const WeekCard = ({ w }: { w: (typeof project.weeks)[number] }) => {
    const done = w.tasks.filter((t) => t.completedAt).length;
    const isCurrent = w.weekStart === thisWeek;
    return (
      <Link
        href={`/projects/${project.slug}/weeks/${w.id}`}
        className={`block rounded-xl border p-4 transition hover:shadow-md ${isCurrent ? "border-brand bg-brand-soft" : "border-stone-200 bg-white"}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold">{formatWeek(w.weekStart)}</span>
          {isCurrent && <span className="pill bg-brand text-white">This week</span>}
        </div>
        <p className="mt-1 truncate text-sm text-stone-700">{w.topic || <span className="italic text-stone-400">No topic yet</span>}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          <span>Meets {formatDay(dateInWeek(w.weekStart, project.meetingDay))}</span>
          <span>{done}/{w.tasks.length} tasks</span>
          <span>{w._count.attachments} files</span>
          <span className={`pill ${w.status === "READY" ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-600"}`}>
            {w.status === "READY" ? "Lesson ready" : "Draft"}
          </span>
        </div>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📖 {project.name}</h1>
        <p className="mt-1 text-sm text-stone-600">
          Meets every {DAY_NAMES[project.meetingDay]}
          {project.meetingTime && ` at ${project.meetingTime}`}
          {project.location && ` · ${project.location}`}
        </p>
        {project.description && <p className="mt-2 max-w-2xl text-sm text-stone-600">{project.description}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="space-y-3">
            <h2 className="card-title">Weekly plans</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {upcoming.map((w) => <WeekCard key={w.id} w={w} />)}
            </div>
            <form action={openWeek} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <div>
                <label className="label" htmlFor="date">Plan further ahead</label>
                <input id="date" name="date" type="date" required defaultValue={addDays(thisWeek, 14)} className="input" />
              </div>
              <button className="btn-secondary">Open that week</button>
            </form>
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="card-title">Past weeks</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {past.map((w) => <WeekCard key={w.id} w={w} />)}
              </div>
            </section>
          )}
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Weekly to-dos</h2>
              <span className="text-xs text-stone-500">Repeat every week</span>
            </div>
            <ul className="divide-y divide-stone-100">
              {recurring.length === 0 && <li className="px-4 py-4 text-sm text-stone-500">None yet.</li>}
              {recurring.map((r) => (
                <li key={r.id} className={`px-4 py-3 ${r.active ? "" : "opacity-50"}`}>
                  <div className="flex items-start gap-3">
                    <Avatar user={r.assignee} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium leading-snug">{r.title}</p>
                      <p className="text-xs text-stone-500">
                        {r.assignee.name} · every {DAY_NAMES[r.dayOfWeek]}
                        {!r.active && " · paused"}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-brand">Edit</summary>
                      <div className="mt-3 space-y-3">
                        <RecurringForm projectId={project.id} users={users} item={r} />
                        <form action={setRecurringActive.bind(null, r.id, !r.active)}>
                          <button className="text-xs font-medium text-stone-500 hover:underline">
                            {r.active ? "Pause (stop adding it to lists)" : "Resume"}
                          </button>
                        </form>
                      </div>
                    </details>
                  )}
                </li>
              ))}
            </ul>
            {isAdmin && (
              <details className="border-t border-stone-100 p-4">
                <summary className="cursor-pointer text-sm font-semibold text-brand">+ Add a weekly to-do</summary>
                <div className="mt-3">
                  <RecurringForm projectId={project.id} users={users} />
                </div>
              </details>
            )}
          </section>

          {isAdmin && (
            <section className="card">
              <details className="p-4">
                <summary className="cursor-pointer text-sm font-semibold text-stone-700">Project settings</summary>
                <StateForm action={updateProject} className="mt-4 space-y-3">
                  <input type="hidden" name="id" value={project.id} />
                  <div>
                    <label className="label" htmlFor="name">Name</label>
                    <input id="name" name="name" defaultValue={project.name} className="input" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label" htmlFor="meetingDay">Meets on</label>
                      <select id="meetingDay" name="meetingDay" defaultValue={project.meetingDay} className="input">
                        {DAY_NAMES.map((d, i) => <option key={d} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label" htmlFor="meetingTime">Time</label>
                      <input id="meetingTime" name="meetingTime" defaultValue={project.meetingTime} className="input" />
                    </div>
                  </div>
                  <div>
                    <label className="label" htmlFor="location">Where</label>
                    <input id="location" name="location" defaultValue={project.location} className="input" placeholder="Zoom link, address…" />
                  </div>
                  <div>
                    <label className="label" htmlFor="description">About</label>
                    <textarea id="description" name="description" rows={3} defaultValue={project.description} className="input" />
                  </div>
                  <SubmitButton>Save settings</SubmitButton>
                </StateForm>
              </details>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
