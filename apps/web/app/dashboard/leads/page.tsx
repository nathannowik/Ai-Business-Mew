"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { Lead, LeadFollowUpConfig, LeadMessage } from "@mew/shared";
import { api, getToken } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function exportLeadsCsv() {
  const res = await fetch(`${API_URL}/leads/export.csv`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const STATUS_STYLES: Record<string, string> = {
  new: "bg-slate-100 text-slate-600",
  contacted: "bg-amber-100 text-amber-700",
  qualified: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function LeadsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Lead Follow-Up</h1>
      <p className="mt-1 text-slate-500">
        New leads get an instant reply. The AI qualifies them and books the job.
        Connect Twilio/email under Integrations to send for real — otherwise it
        simulates.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ConfigForm />
        <Simulator />
      </div>

      <LeadsList />
    </div>
  );
}

function ConfigForm() {
  const [config, setConfig] = useState<LeadFollowUpConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<LeadFollowUpConfig>("/lead-follow-up/config").then(setConfig);
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await api("/lead-follow-up/config", {
        method: "PUT",
        body: JSON.stringify(config),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!config) return <p className="text-slate-400">Loading…</p>;

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Configuration</h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={config.enabled}
            onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 space-y-4">
        <Field
          label="Business name"
          value={config.businessName}
          onChange={(v) => setConfig({ ...config, businessName: v })}
        />
        <Area
          label="Qualification criteria"
          value={config.qualificationCriteria}
          onChange={(v) => setConfig({ ...config, qualificationCriteria: v })}
        />
        <Area
          label="Extra instructions"
          value={config.instructions}
          onChange={(v) => setConfig({ ...config, instructions: v })}
        />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">
            Preferred channel
          </span>
          <select
            value={config.preferredChannel}
            onChange={(e) =>
              setConfig({
                ...config,
                preferredChannel: e.target.value as LeadFollowUpConfig["preferredChannel"],
              })
            }
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            <option value="sms">SMS</option>
            <option value="email">Email</option>
          </select>
        </label>

        <div className="rounded-lg border border-slate-200 p-3">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={config.dripEnabled}
              onChange={(e) => setConfig({ ...config, dripEnabled: e.target.checked })}
            />
            Auto re-engage quiet leads (drip)
          </label>
          <label className="mt-3 block">
            <span className="mb-1 block text-sm text-slate-600">
              Nudge after (days, comma-separated)
            </span>
            <input
              value={config.dripStepsDays.join(", ")}
              onChange={(e) =>
                setConfig({
                  ...config,
                  dripStepsDays: e.target.value
                    .split(",")
                    .map((s) => parseInt(s.trim(), 10))
                    .filter((n) => Number.isFinite(n) && n > 0),
                })
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {saved && <span className="text-sm text-green-600">Saved ✓</span>}
      </div>
    </section>
  );
}

function Simulator() {
  const [leadId, setLeadId] = useState<string | undefined>();
  const [name, setName] = useState("Jordan");
  const [phone, setPhone] = useState("+15551234567");
  const [inquiry, setInquiry] = useState("My water heater is leaking, can someone come out?");
  const [messages, setMessages] = useState<LeadMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ leadId: string; lead: Lead }>(
        "/lead-follow-up/simulate",
        {
          method: "POST",
          body: JSON.stringify({ seed: { name, phone, inquiry } }),
        },
      );
      setLeadId(res.leadId);
      setMessages(res.lead.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    const message = input.trim();
    if (!message || !leadId || busy) return;
    setInput("");
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ lead: Lead }>("/lead-follow-up/simulate", {
        method: "POST",
        body: JSON.stringify({ leadId, message }),
      });
      setMessages(res.lead.messages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-[560px] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Test a lead (simulator)</h2>
        {leadId && (
          <button
            onClick={() => {
              setLeadId(undefined);
              setMessages([]);
            }}
            className="text-sm text-slate-400 hover:text-slate-600"
          >
            Reset
          </button>
        )}
      </div>

      {!leadId ? (
        <div className="space-y-3 p-6">
          <p className="text-sm text-slate-500">
            Seed a new lead, then the AI sends the first message automatically.
          </p>
          <Field label="Name" value={name} onChange={setName} />
          <Field label="Phone" value={phone} onChange={setPhone} />
          <Area label="Inquiry" value={inquiry} onChange={setInquiry} />
          <button
            onClick={start}
            disabled={busy}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {busy ? "Starting…" : "Start follow-up"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <>
          <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.direction === "inbound" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.direction === "inbound"
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-800"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {busy && <p className="text-sm text-slate-400">AI is typing…</p>}
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div ref={bottomRef} />
          </div>
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Reply as the lead…"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <button
                onClick={send}
                disabled={busy}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function LeadsList() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      api<Lead[]>("/leads").then(setLeads).catch(() => undefined);
    }, 4000);
    api<Lead[]>("/leads").then(setLeads).catch(() => setLeads([]));
    return () => clearInterval(id);
  }, []);

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Leads</h2>
        <button
          onClick={exportLeadsCsv}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {leads.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No leads yet. Use the simulator above to create one.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Name</th>
                <th className="px-6 py-3 font-medium">Contact</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Source</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leads.map((l) => (
                <Fragment key={l.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 font-medium text-slate-800">
                      {l.name}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {l.phone ?? l.email ?? "—"}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[l.status] ?? ""
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{l.source}</td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setOpen(open === l.id ? null : l.id)}
                        className="text-brand-600 hover:underline"
                      >
                        {open === l.id ? "Hide" : "Messages"}
                      </button>
                    </td>
                  </tr>
                  {open === l.id && (
                    <tr>
                      <td colSpan={5} className="bg-slate-50 px-6 py-4">
                        <div className="space-y-2">
                          {l.messages.map((m, i) => (
                            <p key={i} className="text-sm">
                              <span className="font-medium text-slate-500">
                                {m.direction === "inbound" ? "Lead" : "AI"}:
                              </span>{" "}
                              {m.text}
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

function Field({
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

function Area({
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
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
