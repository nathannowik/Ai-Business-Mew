"use client";

import { useEffect, useState } from "react";
import type { Appointment } from "@mew/shared";
import { api } from "../../../lib/api";

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);

  useEffect(() => {
    api<Appointment[]>("/appointments").then(setItems).catch(() => setItems([]));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
      <p className="mt-1 text-slate-500">
        Bookings created by the AI receptionist and your team.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No appointments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium">Duration</th>
                <th className="px-6 py-3 font-medium">Notes</th>
                <th className="px-6 py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium text-slate-800">
                    {a.customerName}
                    {a.customerPhone && (
                      <span className="block text-xs text-slate-400">
                        {a.customerPhone}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {new Date(a.startsAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-3 text-slate-600">
                    {a.durationMinutes} min
                  </td>
                  <td className="px-6 py-3 text-slate-500">{a.notes ?? "—"}</td>
                  <td className="px-6 py-3 text-slate-500">{a.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
