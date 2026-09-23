import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { TaskForm } from "@/components/TaskForm";

export const metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [task, users, projects] = await Promise.all([
    db.task.findUnique({ where: { id } }),
    db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);
  if (!task) notFound();
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link href={`/tasks/${id}`} className="text-sm text-stone-500 hover:underline">← Back to task</Link>
      <h1 className="text-2xl font-bold">Edit task</h1>
      {task.recurringId && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          This is one week's copy of a weekly to-do. Changes here only affect this week. To change every week, edit it on the project page.
        </p>
      )}
      <TaskForm users={users} projects={projects} task={task} defaults={{ dueDate: todayStr() }} />
    </div>
  );
}
