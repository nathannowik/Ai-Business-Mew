"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardSummary, ServiceDefinition } from "@mew/shared";
import { api } from "../../lib/api";

type ServiceTile = ServiceDefinition & { enabled: boolean; entitled: boolean };

// Live services that have a dedicated dashboard page.
const SERVICE_LINKS: Record<string, string> = {
  receptionist: "/dashboard/receptionist",
  lead_follow_up: "/dashboard/leads",
  customer_service: "/dashboard/customer-service",
  marketing_assistant: "/dashboard/marketing",
  document_automation: "/dashboard/documents",
  review_management: "/dashboard/reviews",
  business_reporting: "/dashboard/reporting",
  knowledge_base: "/dashboard/employee-kb",
  sales_assistant: "/dashboard/sales",
  scheduling: "/dashboard/appointments",
};

const STATUS_STYLES: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  beta: "bg-amber-100 text-amber-700",
  planned: "bg-slate-100 text-slate-500",
};

export default function OverviewPage() {
  const [services, setServices] = useState<ServiceTile[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    api<ServiceTile[]>("/services").then(setServices).catch(() => setServices([]));
    api<DashboardSummary>("/dashboard-summary").then(setSummary).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-slate-500">Your business at a glance.</p>

      {summary && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Leads" value={summary.metrics.leads} />
            <Stat label="Appointments" value={summary.metrics.appointments} />
            <Stat label="Calls" value={summary.metrics.calls} />
            <Stat label="Reviews" value={summary.metrics.reviews} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Upcoming appointments</h2>
              {summary.upcomingAppointments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">Nothing scheduled.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {summary.upcomingAppointments.map((a) => (
                    <li key={a.id} className="flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{a.customerName}</span>
                      <span className="text-slate-500">{new Date(a.startsAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h2 className="font-semibold text-slate-900">Recent activity</h2>
              {summary.recentActivity.length === 0 ? (
                <p className="mt-2 text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {summary.recentActivity.map((e) => (
                    <li key={e.id} className="text-sm text-slate-600">
                      {e.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}

      <h2 className="mt-8 text-lg font-semibold text-slate-900">Your AI services</h2>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const tile = (
            <div
              className={`h-full rounded-xl border border-slate-200 bg-white p-5 transition ${
                s.status === "live" ? "hover:shadow-md" : "opacity-80"
              }`}
            >
              <div className="flex items-start justify-between">
                <h2 className="font-semibold text-slate-900">{s.name}</h2>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    STATUS_STYLES[s.status] ?? ""
                  }`}
                >
                  {s.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">{s.description}</p>
              {s.status !== "planned" && !s.entitled && (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  🔒 Not in your plan —{" "}
                  <Link href="/dashboard/billing" className="underline">
                    upgrade
                  </Link>
                </p>
              )}
            </div>
          );
          const href = SERVICE_LINKS[s.key];
          return href ? (
            <Link key={s.key} href={href}>
              {tile}
            </Link>
          ) : (
            <div key={s.key}>{tile}</div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
