"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

interface Turn {
  role: "user" | "assistant";
  text: string;
}

export default function EmployeeKbPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
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
    const history = turns;
    setTurns((t) => [...t, { role: "user", text: message }]);
    setBusy(true);
    try {
      const res = await api<{ reply: string }>("/employee-kb/chat", {
        method: "POST",
        body: JSON.stringify({ message, history }),
      });
      setTurns((t) => [...t, { role: "assistant", text: res.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Employee Knowledge Base</h1>
      <p className="mt-1 text-slate-500">
        An internal assistant for your team, trained on your company documents —
        including internal policies and SOPs. Manage docs under{" "}
        <Link href="/dashboard/knowledge" className="text-brand-600 underline">
          Knowledge Base
        </Link>{" "}
        (mark sensitive ones “internal”).
      </p>

      <section className="mt-6 flex h-[560px] max-w-3xl flex-col rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {turns.length === 0 && (
            <p className="text-sm text-slate-400">
              Ask anything an employee might need — e.g. “What’s our refund
              policy?”, “How do we handle an after-hours emergency call?”, or
              “What’s the markup on parts?”.
            </p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  t.role === "user" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-800"
                }`}
              >
                {t.text}
              </div>
            </div>
          ))}
          {busy && <p className="text-sm text-slate-400">Thinking…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div ref={bottomRef} />
        </div>
        <div className="border-t border-slate-200 p-3">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask about a policy or procedure…"
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
    </div>
  );
}
