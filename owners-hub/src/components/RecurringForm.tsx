import { saveRecurring } from "@/app/actions";
import { DAY_NAMES } from "@/lib/dates";
import { StateForm, SubmitButton } from "./forms";

export function RecurringForm({
  projectId,
  users,
  item,
}: {
  projectId: string;
  users: { id: string; name: string }[];
  item?: { id: string; title: string; description: string; assigneeId: string; dayOfWeek: number };
}) {
  return (
    <StateForm action={saveRecurring} resetOnOk={!item} className="space-y-3">
      <input type="hidden" name="projectId" value={projectId} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <input name="title" required defaultValue={item?.title} className="input" placeholder="e.g. Create weekly graphic" aria-label="Title" />
      <div className="grid grid-cols-2 gap-3">
        <select name="assigneeId" required defaultValue={item?.assigneeId ?? ""} className="input" aria-label="Assign to">
          <option value="" disabled>Who?</option>
          {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <select name="dayOfWeek" required defaultValue={item?.dayOfWeek ?? 1} className="input" aria-label="Due day">
          {DAY_NAMES.map((d, i) => <option key={d} value={i}>Every {d}</option>)}
        </select>
      </div>
      <textarea name="description" rows={2} defaultValue={item?.description} className="input" placeholder="Instructions (optional)" aria-label="Instructions" />
      <SubmitButton className="btn-primary w-full sm:w-auto">{item ? "Save" : "Add weekly to-do"}</SubmitButton>
    </StateForm>
  );
}
