"use client";

import { useEffect, useState } from "react";
import type { BillingPlan, SubscriptionDTO } from "@mew/shared";
import { api } from "../../../lib/api";

type SubResponse = SubscriptionDTO & { stripeEnabled: boolean };

export default function BillingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [sub, setSub] = useState<SubResponse | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [p, s] = await Promise.all([
      api<BillingPlan[]>("/billing/plans"),
      api<SubResponse>("/billing/subscription"),
    ]);
    setPlans(p);
    setSub(s);
  }

  useEffect(() => {
    load().catch(() => undefined);
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") === "success") setNotice("Subscription active — thanks!");
    if (params.get("status") === "cancel") setNotice("Checkout canceled.");
  }, []);

  async function subscribe(planKey: string) {
    setBusy(planKey);
    setNotice(null);
    try {
      const res = await api<{ url: string; simulated: boolean }>("/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ planKey }),
      });
      if (res.simulated) {
        // No Stripe configured — plan was activated instantly; refresh state.
        await load();
        setNotice("Plan activated (simulation mode — no real charge).");
      } else {
        window.location.href = res.url; // Stripe Checkout
      }
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function manage() {
    const res = await api<{ url: string }>("/billing/portal", { method: "POST" });
    window.location.href = res.url;
  }

  async function cancelPlan() {
    if (!confirm("Cancel this subscription?")) return;
    await api("/billing/cancel", { method: "POST" });
    await load();
    setNotice("Subscription canceled.");
  }

  const activePlanKey =
    sub && (sub.status === "active" || sub.status === "trialing") ? sub.planKey : null;

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Billing &amp; Plans</h1>
      <p className="mt-1 text-slate-500">
        Choose a plan to unlock services. Plans control which AI services each
        client can use.
      </p>

      {notice && (
        <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
          {notice}
        </div>
      )}

      {sub && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <p className="text-sm text-slate-500">Current plan</p>
            <p className="text-lg font-semibold text-slate-900">
              {activePlanKey
                ? plans.find((p) => p.key === activePlanKey)?.name ?? activePlanKey
                : "No active plan"}
              {sub.simulated && activePlanKey && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  simulation
                </span>
              )}
            </p>
            <p className="text-sm text-slate-400">
              Status: {sub.status}
              {sub.currentPeriodEnd &&
                ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}`}
            </p>
          </div>
          {activePlanKey && (
            <div className="flex gap-2">
              {sub.stripeEnabled && !sub.simulated && (
                <button
                  onClick={manage}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Manage billing
                </button>
              )}
              <button
                onClick={cancelPlan}
                className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.key === activePlanKey;
          return (
            <div
              key={plan.key}
              className={`flex flex-col rounded-xl border bg-white p-6 ${
                current ? "border-brand-500 ring-2 ring-brand-100" : "border-slate-200"
              }`}
            >
              <h2 className="font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{plan.description}</p>
              <p className="mt-4">
                <span className="text-3xl font-bold text-slate-900">
                  ${plan.priceMonthly}
                </span>
                <span className="text-slate-400">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-brand-600">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                disabled={busy === plan.key || current}
                onClick={() => subscribe(plan.key)}
                className={`mt-6 rounded-lg px-4 py-2 text-sm font-medium ${
                  current
                    ? "cursor-default bg-slate-100 text-slate-500"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                } disabled:opacity-60`}
              >
                {current
                  ? "Current plan"
                  : busy === plan.key
                    ? "…"
                    : activePlanKey
                      ? "Switch to this plan"
                      : "Choose plan"}
              </button>
            </div>
          );
        })}
      </div>

      {sub && !sub.stripeEnabled && (
        <p className="mt-4 text-xs text-slate-400">
          Stripe isn&apos;t configured, so plans activate in simulation mode (no
          real charges). Add STRIPE_SECRET_KEY to enable real checkout.
        </p>
      )}
    </div>
  );
}
