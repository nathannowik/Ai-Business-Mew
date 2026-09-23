import Link from "next/link";
import { relativeDay, formatWeek } from "@/lib/dates";
import { Avatar } from "./Avatar";
import { TaskCheckbox } from "./TaskCheckbox";

export type TaskRowData = {
  id: string;
  title: string;
  dueDate: string;
  completedAt: Date | null;
  assignee: { id: string; name: string };
  week: { id: string; weekStart: string; project: { slug: string; name: string } } | null;
  _count?: { comments: number };
};

export function TaskRow({ task, today, showAssignee = false, showDue = true }: { task: TaskRowData; today: string; showAssignee?: boolean; showDue?: boolean }) {
  const done = Boolean(task.completedAt);
  const overdue = !done && task.dueDate < today;
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <div className="pt-0.5">
        <TaskCheckbox taskId={task.id} done={done} label={task.title} />
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/tasks/${task.id}`} className={`block font-medium leading-snug hover:underline ${done ? "text-stone-400 line-through" : ""}`}>
          {task.title}
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-stone-500">
          {showDue && (
            <span className={overdue ? "font-semibold text-red-700" : ""}>{overdue ? `Overdue · ${relativeDay(task.dueDate, today)}` : relativeDay(task.dueDate, today)}</span>
          )}
          {task.week && (
            <Link href={`/projects/${task.week.project.slug}/weeks/${task.week.id}`} className="font-medium text-brand hover:underline">
              {task.week.project.name} · {formatWeek(task.week.weekStart)} →
            </Link>
          )}
          {!!task._count?.comments && <span>💬 {task._count.comments}</span>}
        </div>
      </div>
      {showAssignee && <Avatar user={task.assignee} />}
    </li>
  );
}

export const taskRowInclude = {
  assignee: { select: { id: true, name: true } },
  week: { select: { id: true, weekStart: true, project: { select: { slug: true, name: true } } } },
  _count: { select: { comments: true } },
} as const;
