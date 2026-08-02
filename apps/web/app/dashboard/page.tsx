"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DashboardSummary, ServiceDefinition } from "@mew/shared";
import { api } from "../../lib/api";
import { Icon, type IconName } from "../../components/icons";

type ServiceTile = ServiceDefinition & { enabled: boolean; entitled: boolean };

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

const SERVICE_ICONS: Record<string, IconName> = {
  receptionist: "phone",
  lead_follow_up: "target",
  customer_service: "chat",
  knowledge_base: "book",
  scheduling: "calendar",
  sales_assistant: "sales",
  marketing_assistant: "megaphone",
  review_management: "star",
  business_reporting: "report",
  document_automation: "document",
};

const STATUS_STYLES: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  beta: "bg-amber-100 text-amber-700",
  planned: "bg-slate-100 text-slate-500",
};

const STAT_META: { key: keyof DashboardSummary["metrics"]; label: string; icon: IconName; tint: string }[] = [
  { key: "leads", label: "Leads", icon: "target", tint: "bg-indigo-50 text-indigo-600" },
  { key: "appointments", label: "Appointments", icon: "calendar", tint: "bg-emerald-50 text-emerald-600" },
  { key: "calls", label: "Calls", icon: "phone", tint: "bg-sky-50 text-sky-600" },
  { key: "reviews", label: "Reviews", icon: "star", tint: "bg-amber-50 text-amber-600" },
];

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
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {STAT_META.map((s) => (
              <div key={s.key} className="card p-5">
                <div className="flex items-center justify-between">
                  <span className={`grid h-10 w-10 place-items-center rounded-xl ${s.tint}`}>
                    <Icon name={s.icon} className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-3xl font-bold text-slate-900">{summary.metrics[s.key]}</p>
                <p className="text-sm text-slate-500">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Upcoming appointments</h2>
                <Link href="/dashboard/appointments" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              </div>
              {summary.upcomingAppointments.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">Nothing scheduled.</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {summary.upcomingAppointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span className="font-medium text-slate-700">{a.customerName}</span>
                      <span className="text-slate-500">{new Date(a.startsAt).toLocaleString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Recent activity</h2>
                <Link href="/dashboard/activity" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                  View all
                </Link>
              </div>
              {summary.recentActivity.length === 0 ? (
                <p className="mt-3 text-sm text-slate-400">No activity yet.</p>
              ) : (
                <ul className="mt-3 space-y-2.5">
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
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => {
          const tile = (
            <div
              className={`card h-full p-5 transition ${
                SERVICE_LINKS[s.key] ? "hover:shadow-card-hover hover:-translate-y-0.5" : "opacity-90"
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <Icon name={SERVICE_ICONS[s.key] ?? "home"} className="h-5 w-5" />
                </span>
                <span className={`badge ${STATUS_STYLES[s.status] ?? ""}`}>{s.status}</span>
              </div>
              <h3 className="mt-3 font-semibold text-slate-900">{s.name}</h3>
              <p className="mt-1 text-sm text-slate-500">{s.description}</p>
              {s.status !== "planned" && !s.entitled && (
                <p className="mt-3 text-xs font-medium text-amber-600">
                  🔒 Not in your plan —{" "}
                  <Link href="/dashboard/billing" className="underline">upgrade</Link>
                </p>
              )}
            </div>
          );
          const href = SERVICE_LINKS[s.key];
          return href ? (
            <Link key={s.key} href={href} className="block">
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
