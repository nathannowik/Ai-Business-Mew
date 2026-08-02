"use client";

import { useEffect, useState } from "react";
import type { Review } from "@mew/shared";
import { api } from "../../../lib/api";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);

  async function load() {
    setReviews(await api<Review[]>("/reviews"));
  }
  useEffect(() => {
    load().catch(() => setReviews([]));
  }, []);

  async function sync() {
    try {
      const res = await api<{ imported: number }>("/reviews/sync", { method: "POST" });
      alert(
        res.imported > 0
          ? `Imported ${res.imported} new review(s).`
          : "No new reviews. (Connect Google Business Profile under Integrations to monitor reviews.)",
      );
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Sync failed");
    }
  }

  return (
    <div>
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Review Management</h1>
          <p className="mt-1 text-slate-500">
            Request reviews after jobs and draft on-brand responses.
          </p>
        </div>
        <button
          onClick={sync}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Sync from Google
        </button>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RequestReview />
        <AddReview onAdded={load} />
      </div>

      <div className="mt-6 space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Reviews</h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-slate-400">No reviews yet.</p>
        ) : (
          reviews.map((r) => <ReviewCard key={r.id} review={r} onChange={load} />)
        )}
      </div>
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500">
      {"★".repeat(n)}
      <span className="text-slate-300">{"★".repeat(5 - n)}</span>
    </span>
  );
}

function ReviewCard({ review, onChange }: { review: Review; onChange: () => void }) {
  const [draft, setDraft] = useState(review.draftResponse ?? "");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    try {
      const updated = await api<Review>(`/reviews/${review.id}/draft-response`, {
        method: "POST",
      });
      setDraft(updated.draftResponse ?? "");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    await api(`/reviews/${review.id}/respond`, {
      method: "POST",
      body: JSON.stringify({ response: draft }),
    });
    onChange();
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-slate-900">
            {review.author} <Stars n={review.rating} />
          </p>
          <p className="text-xs text-slate-400">
            {review.source} ·{" "}
            {review.status === "responded" ? "Responded" : "Awaiting response"}
          </p>
        </div>
        <button
          onClick={generate}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Drafting…" : "Draft response"}
        </button>
      </div>
      <p className="mt-2 text-sm text-slate-600">{review.text}</p>

      {(draft || review.draftResponse) && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <div className="mt-2 flex justify-end">
            <button
              onClick={publish}
              className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
            >
              Mark responded
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function RequestReview() {
  const [customerName, setCustomerName] = useState("Maria Gonzalez");
  const [phone, setPhone] = useState("+15551234567");
  const [jobDescription, setJobDescription] = useState("water heater installation");
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function send() {
    setBusy(true);
    setResult(null);
    try {
      const res = await api<{ message: string; simulated: boolean }>("/reviews/request", {
        method: "POST",
        body: JSON.stringify({ customerName, phone, jobDescription }),
      });
      setResult(
        `${res.simulated ? "(Simulated — connect Twilio to send) " : "Sent! "}${res.message}`,
      );
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Request a review</h2>
      <div className="mt-4 space-y-3">
        <Input label="Customer name" value={customerName} onChange={setCustomerName} />
        <Input label="Phone" value={phone} onChange={setPhone} />
        <Input label="Job" value={jobDescription} onChange={setJobDescription} />
        <button
          onClick={send}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Send review request"}
        </button>
        {result && <p className="text-sm text-slate-600">{result}</p>}
      </div>
    </section>
  );
}

function AddReview({ onAdded }: { onAdded: () => void }) {
  const [author, setAuthor] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!author.trim() || !text.trim()) return;
    setBusy(true);
    try {
      await api("/reviews", {
        method: "POST",
        body: JSON.stringify({ author, rating, text, source: "manual" }),
      });
      setAuthor("");
      setText("");
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6">
      <h2 className="font-semibold text-slate-900">Add a review</h2>
      <p className="mt-1 text-xs text-slate-400">
        Manually log a review (live monitoring via Google Business is on the roadmap).
      </p>
      <div className="mt-4 space-y-3">
        <Input label="Author" value={author} onChange={setAuthor} />
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Rating</span>
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-700">Review text</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
        </label>
        <button
          onClick={add}
          disabled={busy}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add review"}
        </button>
      </div>
    </section>
  );
}

function Input({
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
