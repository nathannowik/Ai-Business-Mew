"use client";

import { useEffect, useState } from "react";
import type { ActivityEvent, ActivityType } from "@mew/shared";
import { api } from "../../../lib/api";

const ICONS: Record<ActivityType, string> = {
  call: "📞",
  lead: "🎯",
  lead_drip: "🔁",
  appointment: "📅",
  review: "⭐",
  chat: "💬",
  document: "📄",
};

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);

  useEffect(() => {
    api<ActivityEvent[]>("/activity")
      .then(setEvents)
      .catch(() => setEvents([]));
    // Opening the page marks everything read.
    api("/activity/read", { method: "POST" }).catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Activity</h1>
      <p className="mt-1 text-slate-500">
        Everything happening across your AI services, newest first.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {events.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No activity yet. As calls, leads, bookings, chats, and reviews come
            in, they&apos;ll appear here.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 px-6 py-3">
                <span className="text-lg">{ICONS[e.type] ?? "•"}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-800">{e.title}</p>
                  {e.detail && <p className="text-sm text-slate-500">{e.detail}</p>}
                </div>
                <span className="whitespace-nowrap text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
