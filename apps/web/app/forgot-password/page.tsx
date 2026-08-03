"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { Logo } from "../../components/icons";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/"><Logo /></Link>
        </div>
        <div className="card p-8">
          <h1 className="text-xl font-bold text-slate-900">Reset your password</h1>
          {sent ? (
            <p className="mt-3 text-sm text-slate-600">
              If an account exists for <strong>{email}</strong>, we&apos;ve sent a
              reset link. Check your inbox.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block">
                <span className="label">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                />
              </label>
              <button type="submit" disabled={busy} className="btn-primary w-full py-2.5">
                {busy ? "…" : "Send reset link"}
              </button>
            </form>
          )}
          <Link href="/login" className="mt-5 block text-center text-sm font-medium text-brand-600 hover:text-brand-700">
            Back to sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
