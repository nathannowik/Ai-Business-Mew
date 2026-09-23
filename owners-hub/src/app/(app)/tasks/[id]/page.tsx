import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDay, formatWeek, relativeDay, todayStr } from "@/lib/dates";
import { addComment, deleteComment, deleteTask } from "@/app/actions";
import { TaskCheckbox } from "@/components/TaskCheckbox";
import { Avatar } from "@/components/Avatar";
import { ConfirmButton, StateForm, SubmitButton } from "@/components/forms";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const task = await db.task.findUnique({ where: { id: (await params).id }, select: { title: true } });
  return { title: task?.title ?? "Task" };
}

const timeFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: process.env.APP_TIMEZONE || "America/Chicago",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export default async function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const task = await db.task.findUnique({
    where: { id },
    include: {
      assignee: true,
      completedBy: true,
      createdBy: true,
      project: true,
      recurring: true,
      week: { include: { project: true, _count: { select: { attachments: true } } } },
      comments: { include: { author: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!task) notFound();
  const admins = await db.user.findMany({ where: { role: "ADMIN", NOT: { id: user.id } }, select: { name: true } });
  const notified = [...new Set([...(task.assigneeId !== user.id ? [task.assignee.name] : []), ...admins.map((a) => a.name)])];
  const today = todayStr();
  const done = Boolean(task.completedAt);
  const overdue = !done && task.dueDate < today;
  const isAdmin = user.role === "ADMIN";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Back to today</Link>

      <section className="card p-5">
        <div className="flex items-start gap-4">
          <div className="pt-1">
            <TaskCheckbox taskId={task.id} done={done} label={task.title} size="lg" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className={`text-xl font-bold leading-snug ${done ? "text-stone-400 line-through" : ""}`}>{task.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-600">
              <span className="flex items-center gap-1.5"><Avatar user={task.assignee} /> {task.assignee.name}</span>
              <span className={overdue ? "font-semibold text-red-700" : ""}>
                Due {relativeDay(task.dueDate, today)}{relativeDay(task.dueDate, today) !== formatDay(task.dueDate) ? ` (${formatDay(task.dueDate)})` : ""}
                {overdue && " · overdue"}
              </span>
              {task.recurring && <span className="pill bg-stone-100 text-stone-600">↻ Every {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][task.recurring.dayOfWeek]}</span>}
            </div>
            {done && task.completedAt && (
              <p className="mt-2 text-sm text-emerald-700">
                ✓ Done {timeFmt.format(task.completedAt)}{task.completedBy && task.completedBy.id !== task.assigneeId ? ` (checked by ${task.completedBy.name})` : ""}
              </p>
            )}
          </div>
        </div>

        {task.description && <p className="mt-5 whitespace-pre-wrap border-t border-stone-100 pt-4 text-[15px] leading-relaxed text-stone-700">{task.description}</p>}

        {task.week && (
          <Link
            href={`/projects/${task.week.project.slug}/weeks/${task.week.id}`}
            className="mt-5 flex items-center justify-between gap-3 rounded-xl bg-brand px-4 py-4 text-white shadow-sm hover:bg-brand-ink"
          >
            <span>
              <span className="block text-xs font-medium uppercase tracking-wide text-indigo-200">Open the weekly plan</span>
              <span className="block font-semibold">
                {task.week.project.name} · {formatWeek(task.week.weekStart)}
              </span>
              <span className="block text-sm text-indigo-100">
                {task.week.topic ? `“${task.week.topic}”` : "Lesson plan, files & uploads"} · {task.week._count.attachments} file{task.week._count.attachments === 1 ? "" : "s"}
              </span>
            </span>
            <span className="text-2xl" aria-hidden>→</span>
          </Link>
        )}

        {isAdmin && (
          <div className="mt-5 flex items-center gap-2 border-t border-stone-100 pt-4">
            <Link href={`/tasks/${task.id}/edit`} className="btn-secondary">Edit</Link>
            <ConfirmButton action={deleteTask.bind(null, task.id)} confirmText="Delete this task and its comments?">Delete</ConfirmButton>
            {task.createdBy && <span className="ml-auto text-xs text-stone-400">Created by {task.createdBy.name}</span>}
          </div>
        )}
      </section>

      <section id="comments" className="card">
        <div className="card-header">
          <h2 className="card-title">Notes & comments</h2>
          <span className="text-xs text-stone-500">Everyone can see these</span>
        </div>
        {task.comments.length === 0 ? (
          <p className="px-4 py-5 text-sm text-stone-500">No notes yet. Add an update, a question, or a link for review.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {task.comments.map((c) => (
              <li key={c.id} className="flex gap-3 px-4 py-3">
                <Avatar user={c.author} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 text-sm">
                    <span className="font-semibold">{c.author.name}</span>
                    <span className="text-xs text-stone-400">{timeFmt.format(c.createdAt)}</span>
                    {(c.authorId === user.id || isAdmin) && (
                      <div className="ml-auto">
                        <ConfirmButton action={deleteComment.bind(null, c.id)} confirmText="Delete this comment?" className="text-xs text-stone-400 hover:text-red-700">
                          Delete
                        </ConfirmButton>
                      </div>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-[15px] text-stone-800">{c.body}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
        <StateForm action={addComment} resetOnOk className="space-y-2 border-t border-stone-100 p-4">
          <input type="hidden" name="taskId" value={task.id} />
          <textarea name="body" rows={3} required className="input" placeholder={isAdmin ? "Leave feedback…" : "Add a note for review…"} />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-stone-500">{notified.length ? `${notified.join(" & ")} will get an email` : ""}</span>
            <SubmitButton pendingText="Posting…">Post</SubmitButton>
          </div>
        </StateForm>
      </section>
    </div>
  );
}
