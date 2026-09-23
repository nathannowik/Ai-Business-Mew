import { requireUser } from "@/lib/auth";
import { changeMyPassword, logout, updateMyProfile } from "@/app/actions";
import { StateForm, SubmitButton } from "@/components/forms";
import { emailConfigured } from "@/lib/email";
import { REMINDER_HOUR } from "@/lib/notify";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUser();
  const hour = REMINDER_HOUR % 12 || 12;
  const ampm = REMINDER_HOUR < 12 ? "AM" : "PM";
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <StateForm action={updateMyProfile} className="card space-y-4 p-5">
        <h2 className="card-title">Profile & reminders</h2>
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" defaultValue={user.name} required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" defaultValue={user.email} required className="input" />
        </div>
        <label className="flex items-start gap-3 rounded-lg bg-stone-50 p-3 text-sm">
          <input type="checkbox" name="emailReminders" defaultChecked={user.emailReminders} className="mt-0.5 h-4 w-4 rounded" />
          <span>
            <span className="font-medium">Email me</span>
            <span className="block text-stone-600">
              A daily to-do list around {hour}:00 {ampm}, plus new tasks and comments on my tasks.
            </span>
          </span>
        </label>
        {!emailConfigured() && <p className="text-xs text-amber-700">Email sending isn't set up on the server yet, so nothing will be delivered until it is.</p>}
        <SubmitButton>Save</SubmitButton>
      </StateForm>

      <StateForm action={changeMyPassword} resetOnOk className="card space-y-4 p-5">
        <h2 className="card-title">Change password</h2>
        <div>
          <label className="label" htmlFor="current">Current password</label>
          <input id="current" name="current" type="password" autoComplete="current-password" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="next">New password</label>
          <input id="next" name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
        </div>
        <SubmitButton>Change password</SubmitButton>
      </StateForm>

      <form action={logout}>
        <button className="btn-secondary w-full">Sign out</button>
      </form>
    </div>
  );
}
