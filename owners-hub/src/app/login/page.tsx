import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { login } from "../actions";
import { StateForm, SubmitButton } from "@/components/forms";

export const metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/");
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-2xl text-white">✓</div>
          <h1 className="text-2xl font-bold">{process.env.APP_NAME || "Owners Hub"}</h1>
          <p className="mt-1 text-sm text-stone-500">Sign in to see today's list</p>
        </div>
        <StateForm action={login} className="card space-y-4 p-6">
          <input type="hidden" name="next" value={next ?? ""} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" required className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required className="input" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Signing in…">Sign in</SubmitButton>
        </StateForm>
        <p className="mt-4 text-center text-xs text-stone-500">Forgot your password? Ask Nathan to reset it.</p>
      </div>
    </main>
  );
}
