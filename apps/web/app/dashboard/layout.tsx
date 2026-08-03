"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api, clearToken, getToken } from "../../lib/api";
import { Icon, Logo, type IconName } from "../../components/icons";

interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  adminOnly?: boolean;
}
interface NavGroup {
  title: string | null;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  {
    title: null,
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home" },
      { href: "/dashboard/activity", label: "Activity", icon: "activity" },
    ],
  },
  {
    title: "AI Services",
    items: [
      { href: "/dashboard/receptionist", label: "Receptionist", icon: "phone" },
      { href: "/dashboard/leads", label: "Lead Follow-Up", icon: "target" },
      { href: "/dashboard/customer-service", label: "Customer Service", icon: "chat" },
      { href: "/dashboard/employee-kb", label: "Employee KB", icon: "book" },
      { href: "/dashboard/sales", label: "Sales Assistant", icon: "sales" },
      { href: "/dashboard/marketing", label: "Marketing", icon: "megaphone" },
      { href: "/dashboard/documents", label: "Documents", icon: "document" },
      { href: "/dashboard/reviews", label: "Reviews", icon: "star" },
      { href: "/dashboard/reporting", label: "Reporting", icon: "report" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/dashboard/calls", label: "Calls", icon: "phone" },
      { href: "/dashboard/appointments", label: "Appointments", icon: "calendar" },
      { href: "/dashboard/knowledge", label: "Knowledge Base", icon: "library" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/dashboard/integrations", label: "Integrations", icon: "plug" },
      { href: "/dashboard/team", label: "Team", icon: "users" },
      { href: "/dashboard/billing", label: "Billing & Plans", icon: "card" },
      { href: "/dashboard/agency", label: "Agency", icon: "building", adminOnly: true },
    ],
  },
];

interface Me {
  name: string;
  email: string;
  organization: { name: string };
  isPlatformAdmin?: boolean;
  impersonating?: boolean;
  emailVerified?: boolean;
}

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "?";
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [unread, setUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => setMobileOpen(false), [pathname]);

  const [resent, setResent] = useState(false);
  async function resendVerification() {
    await api("/auth/resend-verification", { method: "POST" }).catch(() => undefined);
    setResent(true);
  }

  function exitImpersonation() {
    const adminToken = window.localStorage.getItem("mew_admin_token");
    if (adminToken) {
      window.localStorage.setItem("mew_token", adminToken);
      window.localStorage.removeItem("mew_admin_token");
    }
    window.location.href = "/dashboard/agency";
  }

  const allItems = NAV.flatMap((g) => g.items);
  const current = allItems
    .filter((i) => (i.href === "/dashboard" ? pathname === i.href : pathname.startsWith(i.href)))
    .sort((a, b) => b.href.length - a.href.length)[0];

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-400">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="px-5 py-5">
        <Logo />
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {NAV.map((group, gi) => {
          const items = group.items.filter((i) => !i.adminOnly || me?.isPlatformAdmin);
          if (items.length === 0) return null;
          return (
            <div key={gi}>
              {group.title && (
                <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  {group.title}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((item) => {
                  const active =
                    item.href === "/dashboard"
                      ? pathname === item.href
                      : pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600" />
                      )}
                      <Icon name={item.icon} className={`h-[18px] w-[18px] ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-500"}`} />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/dashboard/activity" && unread > 0 && (
                        <span className="badge bg-brand-600 text-white">{unread}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-white">
            {initials(me?.name ?? "")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">{me?.name}</p>
            <p className="truncate text-xs text-slate-400">{me?.organization.name}</p>
          </div>
          <button
            onClick={() => {
              clearToken();
              router.replace("/login");
            }}
            title="Sign out"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 8l-4 4 4 4M6 12h12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-slate-200 bg-white shadow-soft">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur lg:px-8">
          <button
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" className="h-5 w-5">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-sm font-semibold text-slate-800">{current?.label ?? "Dashboard"}</h1>
          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/dashboard/activity"
              className="relative rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              title="Activity"
            >
              <Icon name="activity" className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-600 ring-2 ring-white" />
              )}
            </Link>
          </div>
        </header>

        {me && me.emailVerified === false && (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 px-4 py-2 text-sm text-amber-800 lg:px-8">
            <span>Please verify your email ({me.email}) to secure your account.</span>
            <button
              onClick={resendVerification}
              disabled={resent}
              className="rounded-md border border-amber-300 px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-60"
            >
              {resent ? "Sent — check your inbox" : "Resend email"}
            </button>
          </div>
        )}

        {me?.impersonating && (
          <div className="flex items-center justify-between gap-3 bg-amber-100 px-4 py-2 text-sm text-amber-900 lg:px-8">
            <span>
              Viewing client <strong>{me.organization.name}</strong> as platform admin.
            </span>
            <button
              onClick={exitImpersonation}
              className="rounded-md bg-amber-900 px-3 py-1 text-xs font-medium text-white hover:bg-amber-800"
            >
              Exit client view
            </button>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-6xl animate-fade-in-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
