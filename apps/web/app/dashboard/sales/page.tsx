"use client";

import { useEffect, useState } from "react";
import type { Opportunity, OpportunityStage, SalesCall } from "@mew/shared";
import { api } from "../../../lib/api";

const STAGES: OpportunityStage[] = ["new", "qualified", "proposal", "won", "lost"];
const STAGE_STYLES: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  qualified: "bg-blue-100 text-blue-700",
  proposal: "bg-amber-100 text-amber-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function SalesPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Sales Assistant</h1>
      <p className="mt-1 text-slate-500">
        Analyze sales calls for coaching and follow-ups, and track opportunities.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CallAnalyzer />
        <Pipeline />
      </div>
    </div>
  );
}

function CallAnalyzer() {
  const [title, setTitle] = useState("Discovery call — Acme Corp");
  const [transcript, setTranscript] = useState("");
  const [calls, setCalls] = useState<SalesCall[]>([]);
  const [selected, setSelected] = useState<SalesCall | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setCalls(await api<SalesCall[]>("/sales/calls"));
  }
  useEffect(() => {
    load().catch(() => setCalls([]));
  }, []);

  async function analyze() {
    if (!transcript.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const call = await api<SalesCall>("/sales/analyze", {
        method: "POST",
        body: JSON.stringify({ title, transcript }),
      });
      setSelected(call);
      setTranscript("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Analyze a call</h2>
      <div className="mt-4 space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          placeholder="Paste the call transcript here…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={analyze}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Analyzing…" : "Analyze call"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {calls.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-700">Recent calls</h3>
          <ul className="space-y-1">
            {calls.map((c) => (
              <li key={c.id}>
                <button
                  onClick={() => setSelected(c)}
                  className="text-sm text-brand-600 hover:underline"
                >
                  {c.title}
                  {c.analysis && (
                    <span className="ml-2 text-slate-400">({c.analysis.score}/100)</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected?.analysis && (
        <div className="mt-5 space-y-3 rounded-lg bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-slate-800">
            Score: {selected.analysis.score}/100
          </p>
          <p className="text-slate-600">{selected.analysis.summary}</p>
          <Bullets title="Strengths" items={selected.analysis.strengths} color="text-green-700" />
          <Bullets title="Improvements" items={selected.analysis.improvements} color="text-amber-700" />
          <Bullets title="Next steps" items={selected.analysis.nextSteps} color="text-brand-700" />
          {selected.followUpDraft && (
            <div>
              <p className="font-medium text-slate-700">Follow-up draft</p>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{selected.followUpDraft}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Bullets({ title, items, color }: { title: string; items: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className={`font-medium ${color}`}>{title}</p>
      <ul className="mt-1 list-disc pl-5 text-slate-600">
        {items.map((i, idx) => (
          <li key={idx}>{i}</li>
        ))}
      </ul>
    </div>
  );
}

function Pipeline() {
  const [opps, setOpps] = useState<Opportunity[]>([]);
  const [name, setName] = useState("");
  const [value, setValue] = useState("");

  async function load() {
    setOpps(await api<Opportunity[]>("/sales/opportunities"));
  }
  useEffect(() => {
    load().catch(() => setOpps([]));
  }, []);

  async function add() {
    if (!name.trim()) return;
    await api("/sales/opportunities", {
      method: "POST",
      body: JSON.stringify({ name, value: value ? Number(value) : null }),
    });
    setName("");
    setValue("");
    await load();
  }

  async function setStage(id: string, stage: OpportunityStage) {
    await api(`/sales/opportunities/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ stage }),
    });
    await load();
  }

  const totalOpen = opps
    .filter((o) => o.stage !== "lost")
    .reduce((sum, o) => sum + (o.value ?? 0), 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Pipeline</h2>
        <span className="text-sm text-slate-500">
          ${totalOpen.toLocaleString()} open
        </span>
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Opportunity name"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="$"
          className="w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <button
          onClick={add}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {opps.length === 0 && <p className="text-sm text-slate-400">No opportunities yet.</p>}
        {opps.map((o) => (
          <div
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{o.name}</p>
              {o.value != null && (
                <p className="text-xs text-slate-400">${o.value.toLocaleString()}</p>
              )}
            </div>
            <select
              value={o.stage}
              onChange={(e) => setStage(o.id, e.target.value as OpportunityStage)}
              className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_STYLES[o.stage]}`}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </section>
  );
}
