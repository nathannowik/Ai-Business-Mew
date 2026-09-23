"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Item = { href: string; label: string; icon: string };

function useActive() {
  const path = usePathname();
  return (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
}

/** Desktop: inline in the header. */
export function Nav({ items }: { items: Item[] }) {
  const active = useActive();
  return (
      <nav className="hidden items-center gap-1 md:flex">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${active(i.href) ? "bg-brand-soft text-brand-ink" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {i.label}
          </Link>
        ))}
      </nav>
  );
}

/** Phones: bottom tab bar. Must render outside the header — its backdrop-blur
 * would otherwise become the containing block for this fixed element. */
export function MobileNav({ items }: { items: Item[] }) {
  const active = useActive();
  return (
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {items.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${active(i.href) ? "text-brand" : "text-stone-500"}`}
          >
            <span className="text-lg leading-none" aria-hidden>{i.icon}</span>
            {i.label}
          </Link>
        ))}
      </nav>
  );
}
