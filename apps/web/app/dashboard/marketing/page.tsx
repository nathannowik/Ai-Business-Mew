"use client";

import { useEffect, useState } from "react";
import type { ContentPiece, ContentType } from "@mew/shared";
import { api } from "../../../lib/api";

const TYPES: { key: ContentType; label: string }[] = [
  { key: "social", label: "Social post" },
  { key: "email", label: "Email" },
  { key: "ad", label: "Ad" },
  { key: "blog", label: "Blog post" },
];

export default function MarketingPage() {
  const [contentType, setContentType] = useState<ContentType>("social");
  const [topic, setTopic] = useState("Spring promotion: 10% off water heater installs");
  const [tone, setTone] = useState("friendly");
  const [items, setItems] = useState<ContentPiece[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api<ContentPiece[]>("/marketing/content"));
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function generate() {
    if (!topic.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api("/marketing/generate", {
        method: "POST",
        body: JSON.stringify({ contentType, topic, tone }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api(`/marketing/content/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Marketing Assistant</h1>
      <p className="mt-1 text-slate-500">
        Generate on-brand posts, emails, ads, and blogs from your business info.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-6">
          <h2 className="font-semibold text-slate-900">Create content</h2>
          <div className="mt-4 space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">Type</span>
              <div className="flex flex-wrap gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setContentType(t.key)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                      contentType === t.key
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Topic</span>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Tone</span>
              <input
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <button
              onClick={generate}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Generating…" : "Generate"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </section>

        <section className="space-y-3">
          {items.length === 0 && (
            <p className="text-sm text-slate-400">No content yet. Generate your first piece.</p>
          )}
          {items.map((c) => (
            <div key={c.id} className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                    {c.contentType}
                  </span>
                  <h3 className="mt-2 font-semibold text-slate-900">{c.title}</h3>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => navigator.clipboard.writeText(c.body)}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => remove(c.id)}
                    className="text-sm text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{c.body}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
