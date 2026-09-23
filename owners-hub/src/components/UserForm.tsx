import { saveUser } from "@/app/actions";
import { StateForm, SubmitButton } from "./forms";

export function UserForm({ user }: { user?: { id: string; name: string; email: string; role: string } }) {
  const p = user?.id ?? "new";
  return (
    <StateForm action={saveUser} resetOnOk={!user} className="space-y-3">
      {user && <input type="hidden" name="id" value={user.id} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`name-${p}`}>Name</label>
          <input id={`name-${p}`} name="name" required defaultValue={user?.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`email-${p}`}>Email</label>
          <input id={`email-${p}`} name="email" type="email" required defaultValue={user?.email} className="input" />
        </div>
        <div>
          <label className="label" htmlFor={`role-${p}`}>Role</label>
          <select id={`role-${p}`} name="role" defaultValue={user?.role ?? "MEMBER"} className="input">
            <option value="MEMBER">Member — does tasks, edits plans</option>
            <option value="ADMIN">Admin — also creates & assigns tasks</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`password-${p}`}>{user ? "Reset password" : "Starting password"}</label>
          <input id={`password-${p}`} name="password" type="text" autoComplete="off" minLength={8} required={!user} className="input" placeholder={user ? "Leave blank to keep" : "8+ characters"} />
        </div>
      </div>
      <SubmitButton>{user ? "Save" : "Add person"}</SubmitButton>
    </StateForm>
  );
}
