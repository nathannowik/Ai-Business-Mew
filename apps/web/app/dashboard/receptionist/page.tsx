"use client";

import { useEffect, useRef, useState } from "react";
import type { ReceptionistConfig } from "@mew/shared";
import { api } from "../../../lib/api";

interface SimTurn {
  role: "caller" | "assistant";
  text: string;
}

export default function ReceptionistPage() {
  const [config, setConfig] = useState<ReceptionistConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<ReceptionistConfig>("/receptionist/config").then(setConfig);
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await api("/receptionist/config", {
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
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Receptionist</h1>
      <p className="mt-1 text-slate-500">
        Configure how your AI answers the phone, then test it live on the right.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Config */}
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-900">Configuration</h2>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
              />
              Enabled
            </label>
          </div>

          <div className="mt-4 space-y-4">
            <TextField
              label="Business name"
              value={config.businessName}
              onChange={(v) => setConfig({ ...config, businessName: v })}
            />
            <TextArea
              label="Greeting"
              value={config.greeting}
              onChange={(v) => setConfig({ ...config, greeting: v })}
            />
            <TextField
              label="Business hours"
              value={config.businessHours}
              onChange={(v) => setConfig({ ...config, businessHours: v })}
            />
            <TextField
              label="Transfer number (optional)"
              value={config.transferNumber ?? ""}
              onChange={(v) =>
                setConfig({ ...config, transferNumber: v || null })
              }
            />
            <TextArea
              label="Extra instructions"
              value={config.instructions}
              onChange={(v) => setConfig({ ...config, instructions: v })}
            />
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

        <Simulator />
      </div>
    </div>
  );
}

function Simulator() {
  const [turns, setTurns] = useState<SimTurn[]>([]);
  const [callId, setCallId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send() {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    setError(null);
    setTurns((t) => [...t, { role: "caller", text: message }]);
    setBusy(true);
    try {
      const res = await api<{ callId: string; reply: string }>(
        "/receptionist/simulate",
        { method: "POST", body: JSON.stringify({ callId, message }) },
      );
      setCallId(res.callId);
      setTurns((t) => [...t, { role: "assistant", text: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-[560px] flex-col rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Test call (simulator)</h2>
        <button
          onClick={() => {
            setTurns([]);
            setCallId(undefined);
          }}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Reset
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {turns.length === 0 && (
          <p className="text-sm text-slate-400">
            Type what a caller would say (e.g. &quot;Do you fix water
            heaters?&quot; or &quot;I&apos;d like to book for tomorrow at
            3pm&quot;).
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`flex ${t.role === "caller" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                t.role === "caller"
                  ? "bg-brand-600 text-white"
                  : "bg-slate-100 text-slate-800"
              }`}
            >
              {t.text}
            </div>
          </div>
        ))}
        {busy && <p className="text-sm text-slate-400">Assistant is typing…</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-slate-200 p-3">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Say something as the caller…"
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
    </section>
  );
}

function TextField({
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

function TextArea({
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
