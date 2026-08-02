"use client";

import { useEffect, useState } from "react";
import type { KnowledgeDoc } from "@mew/shared";
import { api } from "../../../lib/api";

export default function KnowledgePage() {
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setDocs(await api<KnowledgeDoc[]>("/knowledge"));
  }

  useEffect(() => {
    load().catch(() => setDocs([]));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setSaving(true);
    try {
      await api("/knowledge", {
        method: "POST",
        body: JSON.stringify({ title, content }),
      });
      setTitle("");
      setContent("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    await api(`/knowledge/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
      <p className="mt-1 text-slate-500">
        Facts your AI uses to answer callers — services, pricing, policies,
        hours. The receptionist only answers from what you put here.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <form
          onSubmit={add}
          className="rounded-xl border border-slate-200 bg-white p-6"
        >
          <h2 className="font-semibold text-slate-900">Add a document</h2>
          <div className="mt-4 space-y-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (e.g. Services & Pricing)"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={6}
              placeholder="The information the AI should know…"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Adding…" : "Add document"}
            </button>
          </div>
        </form>

        <div className="space-y-3">
          {docs.length === 0 && (
            <p className="text-sm text-slate-400">No documents yet.</p>
          )}
          {docs.map((d) => (
            <div
              key={d.id}
              className="rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="flex items-start justify-between">
                <h3 className="font-semibold text-slate-900">{d.title}</h3>
                <button
                  onClick={() => remove(d.id)}
                  className="text-sm text-red-500 hover:underline"
                >
                  Delete
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">
                {d.content}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
