"use client";

import { useEffect, useState } from "react";
import type { DocType, GeneratedDocument } from "@mew/shared";
import { api, getToken } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

const TYPES: { key: DocType; label: string }[] = [
  { key: "quote", label: "Quote" },
  { key: "proposal", label: "Proposal" },
  { key: "invoice", label: "Invoice" },
  { key: "contract", label: "Contract" },
];

export default function DocumentsPage() {
  const [docType, setDocType] = useState<DocType>("quote");
  const [customerName, setCustomerName] = useState("Maria Gonzalez");
  const [details, setDetails] = useState(
    "Water heater replacement: remove old 40-gal unit, install new 50-gal, haul away. Include labor and parts.",
  );
  const [items, setItems] = useState<GeneratedDocument[]>([]);
  const [selected, setSelected] = useState<GeneratedDocument | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api<GeneratedDocument[]>("/documents"));
  }
  useEffect(() => {
    load().catch(() => setItems([]));
  }, []);

  async function generate() {
    if (!customerName.trim() || !details.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const doc = await api<GeneratedDocument>("/documents/generate", {
        method: "POST",
        body: JSON.stringify({ docType, customerName, details }),
      });
      setSelected(doc);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf(id: string) {
    const res = await fetch(`${API_URL}/documents/${id}/pdf`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">AI Document Automation</h1>
      <p className="mt-1 text-slate-500">
        Draft quotes, proposals, invoices, and contracts — download as PDF.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">New document</h2>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setDocType(t.key)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    docType === t.key
                      ? "bg-brand-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Customer</span>
              <input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-slate-700">Details</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <button
              onClick={generate}
              disabled={busy}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {busy ? "Drafting…" : "Generate document"}
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>

          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold text-slate-700">Saved documents</h3>
            {items.length === 0 ? (
              <p className="text-sm text-slate-400">None yet.</p>
            ) : (
              <ul className="space-y-1">
                {items.map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <button
                      onClick={() => setSelected(d)}
                      className="text-brand-600 hover:underline"
                    >
                      {d.title}
                    </button>
                    <button
                      onClick={() => downloadPdf(d.id)}
                      className="text-slate-500 hover:underline"
                    >
                      PDF ↓
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="font-semibold text-slate-900">Preview</h2>
          {selected ? (
            <div className="mt-3">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-slate-800">{selected.title}</p>
                <button
                  onClick={() => downloadPdf(selected.id)}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Download PDF
                </button>
              </div>
              <pre className="max-h-[420px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">
                {selected.content}
              </pre>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-400">
              Generate or select a document to preview it here.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
