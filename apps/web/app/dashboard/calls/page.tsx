"use client";

import { Fragment, useEffect, useState } from "react";
import type { CallTurn } from "@mew/shared";
import { api } from "../../../lib/api";

interface CallRow {
  id: string;
  fromNumber: string;
  status: string;
  summary: string | null;
  startedAt: string;
  transcript: CallTurn[];
}

const STATUS_STYLES: Record<string, string> = {
  completed: "bg-green-100 text-green-700",
  transferred: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  missed: "bg-red-100 text-red-700",
};

export default function CallsPage() {
  const [calls, setCalls] = useState<CallRow[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<CallRow[]>("/receptionist/calls").then(setCalls).catch(() => setCalls([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Calls</h1>
      <p className="mt-1 text-slate-500">
        Every call the AI receptionist handled, with full transcripts.
      </p>

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {calls.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No calls yet. Try the simulator on the AI Receptionist page.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">From</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {calls.map((c) => (
                <Fragment key={c.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {c.fromNumber}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[c.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {new Date(c.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setOpen(open === c.id ? null : c.id)}
                        className="text-brand-600 hover:underline"
                      >
                        {open === c.id ? "Hide" : "Transcript"}
                      </button>
                    </td>
                  </tr>
                  {open === c.id && (
                    <tr>
                      <td colSpan={4} className="bg-slate-50 px-6 py-4">
                        <div className="space-y-2">
                          {(c.transcript ?? []).map((t, i) => (
                            <p key={i} className="text-sm">
                              <span className="font-medium text-slate-500">
                                {t.role === "caller" ? "Caller" : "AI"}:
                              </span>{" "}
                              {t.text}
                            </p>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
