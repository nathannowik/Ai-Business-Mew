"use client";

import { use, useEffect, useState } from "react";
import type { BookingSlot } from "@mew/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function BookingPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = use(params);
  const [businessName, setBusinessName] = useState("");
  const [slots, setSlots] = useState<BookingSlot[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadSlots() {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/public/booking/${orgId}/slots`);
      if (!res.ok) throw new Error("Booking is not available for this business.");
      const data = await res.json();
      setBusinessName(data.businessName);
      setSlots(data.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function book() {
    if (!selected || !name.trim()) return;
    setError(null);
    try {
      const res = await fetch(`${API_URL}/public/booking/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone: phone || undefined, startsAt: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not book");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
      loadSlots(); // refresh in case the slot was taken
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-12">
      <div className="pointer-events-none absolute inset-x-0 -top-40 h-96 bg-gradient-to-b from-brand-100/70 to-transparent blur-2xl" />
      <div className="relative mx-auto max-w-lg">
        <div className="card p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {businessName ? `Book with ${businessName}` : "Book an appointment"}
          </h1>

          {loading && <p className="mt-6 text-slate-400">Loading available times…</p>}
          {error && !done && (
            <p className="mt-6 rounded-lg bg-red-50 px-3 py-2 text-red-600">{error}</p>
          )}

          {done ? (
            <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-6 text-center text-green-800">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-green-600 text-white">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
                  <path d="m5 13 4 4L19 7" />
                </svg>
              </div>
              <p className="mt-3 text-lg font-semibold">You&apos;re booked!</p>
              <p className="mt-1 text-sm">
                {new Date(selected!).toLocaleString()} — we&apos;ll see you then.
              </p>
            </div>
          ) : (
            !loading &&
            !error && (
              <>
                <p className="mt-2 text-slate-500">Pick a time that works for you.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.length === 0 && (
                    <p className="col-span-full text-sm text-slate-400">
                      No open times right now — please check back later.
                    </p>
                  )}
                  {slots.map((s) => (
                    <button
                      key={s.startISO}
                      onClick={() => setSelected(s.startISO)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                        selected === s.startISO
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-slate-200 text-slate-700 hover:border-brand-400 hover:bg-brand-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {selected && (
                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="input"
                    />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Phone (for confirmation)"
                      className="input"
                    />
                    <button onClick={book} className="btn-primary w-full py-2.5">
                      Confirm {new Date(selected).toLocaleString()}
                    </button>
                  </div>
                )}
              </>
            )
          )}
        </div>
        <p className="mt-4 text-center text-xs text-slate-400">Powered by Mew AI</p>
      </div>
    </main>
  );
}
