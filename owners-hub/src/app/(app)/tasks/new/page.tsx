import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { todayStr } from "@/lib/dates";
import { TaskForm } from "@/components/TaskForm";

export const metadata = { title: "New task" };

export default async function NewTaskPage({ searchParams }: { searchParams: Promise<{ assignee?: string; project?: string; due?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [users, projects] = await Promise.all([
    db.user.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
    db.project.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold">New task</h1>
      <p className="text-sm text-stone-600">
        For one-off to-dos. Things that happen every week belong under <strong>Weekly to-dos</strong> on the project page so they show up automatically.
      </p>
      <TaskForm users={users} projects={projects} defaults={{ dueDate: sp.due ?? todayStr(), assigneeId: sp.assignee, projectId: sp.project ?? projects[0]?.id }} />
    </div>
  );
}
