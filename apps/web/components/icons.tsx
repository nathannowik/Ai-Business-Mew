import type { ReactNode } from "react";

/** Minimal, consistent stroke icons (24x24) so the nav reads as one system. */
export type IconName =
  | "home"
  | "activity"
  | "phone"
  | "target"
  | "chat"
  | "book"
  | "sales"
  | "megaphone"
  | "document"
  | "star"
  | "report"
  | "calendar"
  | "library"
  | "plug"
  | "users"
  | "card"
  | "building";

const PATHS: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5" />,
  activity: (
    <>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  phone: (
    <path d="M4 5c0-.6.4-1 1-1h2.3c.5 0 .9.3 1 .8l.7 3c.1.4 0 .8-.3 1L8 10.5a12 12 0 0 0 5.5 5.5l1.7-1.7c.3-.3.7-.4 1-.3l3 .7c.5.1.8.5.8 1V18c0 .6-.4 1-1 1A15 15 0 0 1 4 5Z" />
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  chat: <path d="M4 5h16v11H8l-4 3V5Z" />,
  book: <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Zm0 0v13" />,
  sales: <path d="M4 19V5m0 14h16M7 15l3-4 3 3 5-7" />,
  megaphone: <path d="M4 10v4l10 4V6L4 10Zm0 0H3m11-2 6-3v14l-6-3M8 15v3" />,
  document: <path d="M6 3h8l4 4v14H6V3Zm8 0v4h4M9 12h6M9 16h6" />,
  star: <path d="m12 4 2.4 5 5.6.5-4.2 3.7 1.3 5.3L12 15.9 6.9 18.5l1.3-5.3L4 9.5 9.6 9 12 4Z" />,
  report: <path d="M4 20h16M7 20v-6m5 6V8m5 12v-9" />,
  calendar: <path d="M5 6h14v14H5V6Zm0 4h14M8 3v4m8-4v4" />,
  library: <path d="M4 5h4v14H4V5Zm6 0h4v14h-4V5Zm7 0 3 .5-2.5 13-3-.5L17 5Z" />,
  plug: <path d="M9 3v5m6-5v5M7 8h10v3a5 5 0 0 1-10 0V8Zm5 8v5" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 5a3 3 0 0 1 0 6m5 9c0-2.5-1.5-4.6-3.6-5.5" />
    </>
  ),
  card: <path d="M3 6h18v12H3V6Zm0 4h18M6 15h4" />,
  building: <path d="M4 21V4h10v17M14 9h6v12M7 8h2m-2 4h2m-2 4h2" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "h-[18px] w-[18px]"}
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-sm">
        M
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-900">Mew AI</span>
    </div>
  );
}
