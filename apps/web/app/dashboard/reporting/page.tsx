"use client";

import { useEffect, useState } from "react";
import type { ReportMetrics } from "@mew/shared";
import { api } from "../../../lib/api";

export default function ReportingPage() {
  const [days, setDays] = useState(30);
  const [metrics, setMetrics] = useState<ReportMetrics | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadMetrics(d: number) {
    setMetrics(await api<ReportMetrics>(`/reporting/metrics?days=${d}`));
  }
  useEffect(() => {
    loadMetrics(days).catch(() => setMetrics(null));
  }, [days]);

  async function generateSummary() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ metrics: ReportMetrics; summary: string }>(
        "/reporting/summary",
        { method: "POST", body: JSON.stringify({ days }) },
      );
      setMetrics(res.metrics);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Business Reporting</h1>
          <p className="mt-1 text-slate-500">
            A live snapshot of performance, plus an AI-written summary.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {metrics && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Tile label="Calls" value={metrics.calls.total} sub={`${metrics.calls.completed} completed`} />
            <Tile label="Leads" value={metrics.leads.total} sub={`${metrics.leads.booked} booked`} />
            <Tile label="Appointments" value={metrics.appointments.total} sub={`${metrics.appointments.upcoming} upcoming`} />
            <Tile label="Conversion" value={`${metrics.conversionRate}%`} sub="leads → booked" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Tile label="Chats" value={metrics.chats.total} sub="website" />
            <Tile label="Qualified leads" value={metrics.leads.qualified} sub="" />
            <Tile label="Transferred calls" value={metrics.calls.transferred} sub="" />
            <Tile label="Lost leads" value={metrics.leads.lost} sub="" />
          </div>
        </>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white shadow-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">AI summary</h2>
          <button
            onClick={generateSummary}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Analyzing…" : "Generate summary"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {summary ? (
          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{summary}</p>
        ) : (
          <p className="mt-3 text-sm text-slate-400">
            Click “Generate summary” for a plain-English readout with insights and
            recommendations.
          </p>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: number | string; sub: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}
