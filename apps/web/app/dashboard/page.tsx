"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ServiceDefinition } from "@mew/shared";
import { api } from "../../lib/api";

type ServiceTile = ServiceDefinition & { enabled: boolean; entitled: boolean };

// Live services that have a dedicated dashboard page.
const SERVICE_LINKS: Record<string, string> = {
  receptionist: "/dashboard/receptionist",
  lead_follow_up: "/dashboard/leads",
  customer_service: "/dashboard/customer-service",
};

const STATUS_STYLES: Record<string, string> = {
  live: "bg-green-100 text-green-700",
  beta: "bg-amber-100 text-amber-700",
  planned: "bg-slate-100 text-slate-500",
};

export default function OverviewPage() {
  const [services, setServices] = useState<ServiceTile[]>([]);

  useEffect(() => {
    api<ServiceTile[]>("/services").then(setServices).catch(() => setServices([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Your AI services</h1>
      <p className="mt-1 text-slate-500">
        Everything Mew runs for your business, in one place.
      </p>

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
