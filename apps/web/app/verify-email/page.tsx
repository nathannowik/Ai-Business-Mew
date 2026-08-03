"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "../../lib/api";
import { Logo } from "../../components/icons";

function Verify() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setState("error");
      return;
    }
    api("/auth/verify", { method: "POST", body: JSON.stringify({ token }) })
      .then(() => setState("ok"))
      .catch(() => setState("error"));
  }, [token]);

  return (
    <div className="card p-8 text-center">
      {state === "loading" && <p className="text-slate-500">Verifying…</p>}
      {state === "ok" && (
        <>
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-600 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </div>
          <h1 className="mt-3 text-xl font-bold text-slate-900">Email verified</h1>
          <p className="mt-1 text-sm text-slate-600">Your account is all set.</p>
          <Link href="/dashboard" className="btn-primary mt-5 w-full py-2.5">Go to dashboard</Link>
        </>
      )}
      {state === "error" && (
        <>
          <h1 className="text-xl font-bold text-slate-900">Link invalid or expired</h1>
          <p className="mt-1 text-sm text-slate-600">
            Sign in and request a new verification email from your dashboard.
          </p>
          <Link href="/login" className="btn-secondary mt-5 w-full py-2.5">Back to sign in</Link>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Link href="/"><Logo /></Link>
        </div>
        <Suspense fallback={<div className="card p-8 text-slate-400">Loading…</div>}>
          <Verify />
        </Suspense>
      </div>
    </main>
  );
}
