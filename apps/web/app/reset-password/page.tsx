"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Logo } from "../../components/icons";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-8">
      <h1 className="text-xl font-bold text-slate-900">Choose a new password</h1>
      {!token && (
        <p className="mt-3 text-sm text-red-600">Missing reset token. Use the link from your email.</p>
      )}
      {done ? (
        <>
          <p className="mt-3 text-sm text-slate-600">Your password has been updated.</p>
          <Link href="/login" className="btn-primary mt-5 w-full py-2.5">Sign in</Link>
        </>
      ) : (
        <form onSubmit={submit} className="mt-5 space-y-4">
          <label className="block">
            <span className="label">New password</span>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
            />
          </label>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={busy || !token} className="btn-primary w-full py-2.5">
            {busy ? "…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/"><Logo /></Link>
        </div>
        <Suspense fallback={<div className="card p-8 text-slate-400">Loading…</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
