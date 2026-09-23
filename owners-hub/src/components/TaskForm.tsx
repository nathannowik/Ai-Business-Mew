import { createTask, updateTask } from "@/app/actions";
import { StateForm, SubmitButton } from "./forms";

type Opt = { id: string; name: string };

export function TaskForm({
  users,
  projects,
  task,
  defaults,
}: {
  users: Opt[];
  projects: Opt[];
  task?: { id: string; title: string; description: string; dueDate: string; assigneeId: string; projectId: string | null; weekId: string | null };
  defaults: { dueDate: string; assigneeId?: string; projectId?: string };
}) {
  return (
    <StateForm action={task ? updateTask : createTask} className="card space-y-4 p-5">
      {task && <input type="hidden" name="id" value={task.id} />}
      <div>
        <label className="label" htmlFor="title">What needs to be done?</label>
        <input id="title" name="title" required defaultValue={task?.title} className="input" placeholder="e.g. Design this week's Bible study graphic" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="assigneeId">Assign to</label>
          <select id="assigneeId" name="assigneeId" className="input" defaultValue={task?.assigneeId ?? defaults.assigneeId ?? ""} required>
            <option value="" disabled>Choose…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="dueDate">Due</label>
          <input id="dueDate" name="dueDate" type="date" required defaultValue={task?.dueDate ?? defaults.dueDate} className="input" />
        </div>
      </div>
      <div>
        <label className="label" htmlFor="projectId">Part of</label>
        <select id="projectId" name="projectId" className="input" defaultValue={task ? task.projectId ?? "" : defaults.projectId ?? ""}>
          <option value="">Nothing specific</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <label className="mt-2 flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" name="linkWeek" defaultChecked={task ? Boolean(task.weekId) : true} className="h-4 w-4 rounded" />
          Link it to that week's plan (so they can click straight into it)
        </label>
      </div>
      <div>
        <label className="label" htmlFor="description">Details / instructions</label>
        <textarea id="description" name="description" rows={5} defaultValue={task?.description} className="input" placeholder="Anything they need to know" />
      </div>
      <SubmitButton>{task ? "Save changes" : "Create & notify"}</SubmitButton>
    </StateForm>
  );
}
