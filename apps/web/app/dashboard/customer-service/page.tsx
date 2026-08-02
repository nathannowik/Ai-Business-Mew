"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ChatSession, ChatTurn, CustomerServiceConfig } from "@mew/shared";
import { api } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function CustomerServicePage() {
  const [orgId, setOrgId] = useState<string>("");

  useEffect(() => {
    api<{ organizationId: string }>("/me").then((m) => setOrgId(m.organizationId));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Customer Service</h1>
      <p className="mt-1 text-slate-500">
        A website chat widget that answers customers from your Knowledge Base.
        Add documents under Knowledge Base to improve its answers.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ConfigForm />
          <EmbedCard orgId={orgId} />
        </div>
        <TestChat orgId={orgId} />
      </div>

      <Conversations />
    </div>
  );
}

function ConfigForm() {
  const [config, setConfig] = useState<CustomerServiceConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<CustomerServiceConfig>("/customer-service/config").then(setConfig);
  }, []);

  async function save() {
    if (!config) return;
    setSaving(true);
    setSaved(false);
    try {
      await api("/customer-service/config", {
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
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-6">
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
          label="Greeting"
          value={config.greeting}
          onChange={(v) => setConfig({ ...config, greeting: v })}
        />
        <Area
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
  );
}

function EmbedCard({ orgId }: { orgId: string }) {
  const [copied, setCopied] = useState(false);
  const snippet = `<script src="${API_URL}/widget.js?org=${orgId}"></script>`;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-6">
      <h2 className="font-semibold text-slate-900">Add to your website</h2>
      <p className="mt-1 text-sm text-slate-500">
        Paste this one line before &lt;/body&gt; on any page to show the chat
        bubble.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
        {orgId ? snippet : "Loading…"}
      </pre>
      <button
        disabled={!orgId}
        onClick={() => {
          navigator.clipboard.writeText(snippet);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
      >
        {copied ? "Copied ✓" : "Copy embed code"}
      </button>
    </section>
  );
}

function TestChat({ orgId }: { orgId: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns]);

  async function send() {
    const message = input.trim();
    if (!message || busy || !orgId) return;
    setInput("");
    setError(null);
    setTurns((t) => [...t, { role: "user", text: message, at: "" }]);
    setBusy(true);
    try {
      // Uses the same public endpoint the website widget calls.
      const res = await fetch(`${API_URL}/public/chat/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const data = await res.json();
      setSessionId(data.sessionId);
      setTurns((t) => [...t, { role: "assistant", text: data.reply, at: "" }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex h-[560px] flex-col rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="font-semibold text-slate-900">Test the chat widget</h2>
        <button
          onClick={() => {
            setTurns([]);
            setSessionId(undefined);
          }}
          className="text-sm text-slate-400 hover:text-slate-600"
        >
          Reset
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        {turns.length === 0 && (
          <p className="text-sm text-slate-400">
            Ask a question a customer might ask (e.g. &quot;What are your
            prices?&quot; or &quot;Do you serve my area?&quot;).
          </p>
        )}
        {turns.map((t, i) => (
          <div
            key={i}
            className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                t.role === "user"
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
            placeholder="Ask a question…"
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

function Conversations() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<ChatSession[]>("/customer-service/sessions")
      .then(setSessions)
      .catch(() => setSessions([]));
  }, []);

  return (
    <div className="mt-6">
      <h2 className="mb-3 text-lg font-semibold text-slate-900">
        Recent conversations
      </h2>
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        {sessions.length === 0 ? (
          <p className="p-6 text-sm text-slate-400">
            No conversations yet. Try the test chat above.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Started</th>
                <th className="px-6 py-3 font-medium">Messages</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <Fragment key={s.id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600">
                      {new Date(s.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-slate-500">
                      {s.transcript.length}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setOpen(open === s.id ? null : s.id)}
                        className="text-brand-600 hover:underline"
                      >
                        {open === s.id ? "Hide" : "View"}
                      </button>
                    </td>
                  </tr>
                  {open === s.id && (
                    <tr>
                      <td colSpan={3} className="bg-slate-50 px-6 py-4">
                        <div className="space-y-2">
                          {s.transcript.map((m, i) => (
                            <p key={i} className="text-sm">
                              <span className="font-medium text-slate-500">
                                {m.role === "user" ? "Customer" : "AI"}:
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
