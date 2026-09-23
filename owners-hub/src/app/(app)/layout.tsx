import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { MobileNav, Nav } from "@/components/Nav";
import { Avatar } from "@/components/Avatar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const firstProject = await db.project.findFirst({ orderBy: { createdAt: "asc" }, select: { slug: true, name: true } });
  const items = [
    { href: "/", label: "Today", icon: "☑️" },
    ...(firstProject ? [{ href: `/projects/${firstProject.slug}`, label: firstProject.name, icon: "📖" }] : []),
    { href: "/team", label: "Team", icon: "👥" },
    ...(user.role === "ADMIN" ? [{ href: "/tasks/new", label: "New task", icon: "➕" }] : []),
  ];
  return (
    <div className="pb-24 md:pb-10">
      <header className="sticky top-0 z-10 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand text-sm text-white">✓</span>
            <span>{process.env.APP_NAME || "Owners Hub"}</span>
          </Link>
          <Nav items={items} />
          <Link href="/settings" className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-100" title="Settings">
            <span className="hidden sm:inline">{user.name.split(" ")[0]}</span>
            <Avatar user={user} size="md" />
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
      <MobileNav items={items} />
    </div>
  );
}
