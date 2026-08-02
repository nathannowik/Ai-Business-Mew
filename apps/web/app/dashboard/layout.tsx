"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, clearToken, getToken } from "../../lib/api";

const NAV = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/activity", label: "Activity" },
  { href: "/dashboard/receptionist", label: "AI Receptionist" },
  { href: "/dashboard/leads", label: "AI Lead Follow-Up" },
  { href: "/dashboard/customer-service", label: "AI Customer Service" },
  { href: "/dashboard/employee-kb", label: "AI Employee KB" },
  { href: "/dashboard/sales", label: "AI Sales Assistant" },
  { href: "/dashboard/marketing", label: "AI Marketing" },
  { href: "/dashboard/documents", label: "AI Documents" },
  { href: "/dashboard/reviews", label: "AI Reviews" },
  { href: "/dashboard/reporting", label: "AI Reporting" },
  { href: "/dashboard/calls", label: "Calls" },
  { href: "/dashboard/appointments", label: "Appointments & Scheduling" },
  { href: "/dashboard/knowledge", label: "Knowledge Base" },
  { href: "/dashboard/integrations", label: "Integrations" },
  { href: "/dashboard/billing", label: "Billing & Plans" },
];

interface Me {
  organization: { name: string };
  isPlatformAdmin?: boolean;
  impersonating?: boolean;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!getToken()) return;
    const poll = () =>
      api<{ count: number }>("/activity/unread-count")
        .then((r) => setUnread(r.count))
        .catch(() => undefined);
    poll();
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [pathname]);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<Me>("/me")
      .then((data) => {
        setMe(data);
        setReady(true);
      })
      .catch(() => {
        clearToken();
        router.replace("/login");
      });
  }, [router]);

  function exitImpersonation() {
    const adminToken = window.localStorage.getItem("mew_admin_token");
    if (adminToken) {
      window.localStorage.setItem("mew_token", adminToken);
      window.localStorage.removeItem("mew_admin_token");
    }
    window.location.href = "/dashboard/agency";
  }

  const nav = [...NAV];
  if (me?.isPlatformAdmin) {
    nav.push({ href: "/dashboard/agency", label: "Agency (all clients)" });
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-64 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-6 py-5">
          <p className="text-lg font-bold text-slate-900">Mew AI</p>
          <p className="truncate text-sm text-slate-500">
            {me?.organization.name}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active =
              item.href === "/dashboard"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{item.label}</span>
                {item.href === "/dashboard/activity" && unread > 0 && (
                  <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <button
          onClick={() => {
            clearToken();
            router.replace("/login");
          }}
          className="m-3 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
        >
          Sign out
        </button>
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        {me?.impersonating && (
          <div className="flex items-center justify-between bg-amber-100 px-6 py-2 text-sm text-amber-900">
            <span>
              Viewing client <strong>{me.organization.name}</strong> as platform
              admin.
            </span>
            <button
              onClick={exitImpersonation}
              className="rounded-md bg-amber-900 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
            >
              Exit client view
            </button>
          </div>
        )}
        <main className="flex-1 overflow-y-auto bg-slate-50 p-8">{children}</main>
      </div>
    </div>
  );
}
