"use client";

import { Fragment, useEffect, useState } from "react";
import type { Appointment, SchedulingConfig } from "@mew/shared";
import { api, getToken } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function downloadCsv(path: string, filename: string) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  async function load() {
    setItems(await api<Appointment[]>("/appointments"));
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function act(path: string) {
    const res = await api<{ message?: string; simulated?: boolean }>(path, { method: "POST" });
    if (res?.message) {
      setFlash(`${res.simulated ? "(Simulated) " : "Sent: "}${res.message}`);
      setTimeout(() => setFlash(null), 6000);
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments &amp; Scheduling</h1>
          <p className="mt-1 text-slate-500">
            Bookings from the AI receptionist, self-service, and your team.
          </p>
        </div>
        <button
          onClick={() => downloadCsv("/appointments/export.csv", "appointments.csv")}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      <BookingSettings />

      {flash && (
        <div className="mt-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">{flash}</div>
      )}

      <NewAppointment onCreated={load} />

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">No appointments yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Customer</th>
                <th className="px-6 py-3 font-medium">When</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((a) => (
                <Fragment key={a.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {a.customerName}
                      {a.customerPhone && (
                        <span className="block text-xs text-slate-400">{a.customerPhone}</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(a.startsAt).toLocaleString()}
                      <span className="block text-xs text-slate-400">{a.durationMinutes} min</span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{a.source}</td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-3">
                        <button onClick={() => act(`/appointments/${a.id}/confirm`)} className="text-brand-600 hover:underline">
                          Confirm
                        </button>
                        <button onClick={() => act(`/appointments/${a.id}/remind`)} className="text-brand-600 hover:underline">
                          Remind
                        </button>
                        <button onClick={() => setOpenId(openId === a.id ? null : a.id)} className="text-slate-600 hover:underline">
                          Reschedule
                        </button>
                      </div>
                    </td>
                  </tr>
                  {openId === a.id && (
                    <tr>
                      <td colSpan={4} className="bg-slate-50 px-6 py-4">
                        <Reschedule
                          appt={a}
                          onDone={() => {
                            setOpenId(null);
                            load();
                          }}
                        />
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

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function BookingSettings() {
  const [orgId, setOrgId] = useState("");
  const [config, setConfig] = useState<SchedulingConfig | null>(null);
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api<{ organizationId: string }>("/me").then((m) => setOrgId(m.organizationId));
    api<SchedulingConfig>("/scheduling/config").then(setConfig).catch(() => undefined);
  }, []);

  const link = orgId ? `${window.location.origin}/book/${orgId}` : "";

  async function save() {
    if (!config) return;
    await api("/scheduling/config", { method: "PUT", body: JSON.stringify(config) });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <section className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Self-service booking</h2>
        <button onClick={() => setOpen((v) => !v)} className="text-sm text-brand-600 hover:underline">
          {open ? "Hide settings" : "Availability settings"}
        </button>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Share this link so customers can book themselves. Double-booking is
        prevented automatically.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
          {link || "…"}
        </code>
        <button
          disabled={!link}
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
        <a
          href={link || "#"}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Preview
        </a>
      </div>

      {open && config && (
        <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-slate-700">Slot length (minutes):</span>
            <input
              type="number"
              value={config.slotMinutes}
              onChange={(e) => setConfig({ ...config, slotMinutes: Number(e.target.value) || 30 })}
              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-sm"
            />
          </label>
          <div className="space-y-1">
            {config.weekly.map((w, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <label className="flex w-24 items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!w}
                    onChange={(e) => {
                      const weekly = [...config.weekly];
                      weekly[i] = e.target.checked ? { start: "09:00", end: "17:00" } : null;
                      setConfig({ ...config, weekly });
                    }}
                  />
                  {DAYS[i]}
                </label>
                {w && (
                  <>
                    <input
                      type="time"
                      value={w.start}
                      onChange={(e) => {
                        const weekly = [...config.weekly];
                        weekly[i] = { ...w, start: e.target.value };
                        setConfig({ ...config, weekly });
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    />
                    <span className="text-slate-400">to</span>
                    <input
                      type="time"
                      value={w.end}
                      onChange={(e) => {
                        const weekly = [...config.weekly];
                        weekly[i] = { ...w, end: e.target.value };
                        setConfig({ ...config, weekly });
                      }}
                      className="rounded-lg border border-slate-300 px-2 py-1"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={save}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            Save availability
          </button>
          {saved && <span className="ml-2 text-sm text-green-600">Saved ✓</span>}
        </div>
      )}
    </section>
  );
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

function Reschedule({ appt, onDone }: { appt: Appointment; onDone: () => void }) {
  const [when, setWhen] = useState(toLocalInput(appt.startsAt));
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      await api(`/appointments/${appt.id}`, {
        method: "PATCH",
        body: JSON.stringify({ startsAt: new Date(when).toISOString() }),
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }
  async function cancel() {
    if (!confirm("Cancel this appointment?")) return;
    await api(`/appointments/${appt.id}/cancel`, { method: "POST" });
    onDone();
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        type="datetime-local"
        value={when}
        onChange={(e) => setWhen(e.target.value)}
        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
      <button
        onClick={save}
        disabled={busy}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save new time"}
      </button>
      <button
        onClick={cancel}
        className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
      >
        Cancel appointment
      </button>
    </div>
  );
}

function NewAppointment({ onCreated }: { onCreated: () => void }) {
  const [show, setShow] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!customerName.trim() || !startsAt) return;
    setBusy(true);
    try {
      await api("/appointments", {
        method: "POST",
        body: JSON.stringify({
          customerName,
          customerPhone: customerPhone || null,
          startsAt: new Date(startsAt).toISOString(),
          notes: notes || null,
        }),
      });
      setCustomerName("");
      setCustomerPhone("");
      setStartsAt("");
      setNotes("");
      setShow(false);
      onCreated();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4">
      <button
        onClick={() => setShow((v) => !v)}
        className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        {show ? "Close" : "+ New appointment"}
      </button>
      {show && (
        <form
          onSubmit={create}
          className="mt-3 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2"
        >
          <Input label="Customer name" value={customerName} onChange={setCustomerName} />
          <Input label="Phone (optional)" value={customerPhone} onChange={setCustomerPhone} />
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">When</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <Input label="Notes (optional)" value={notes} onChange={setNotes} />
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create appointment"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
