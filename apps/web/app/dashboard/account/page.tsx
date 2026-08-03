"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, getToken } from "../../../lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function AccountPage() {
  const router = useRouter();
  const [me, setMe] = useState<{ role: string; organization: { name: string } } | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api<{ role: string; organization: { name: string } }>("/me").then(setMe).catch(() => undefined);
  }, []);

  async function exportData() {
    const res = await fetch(`${API_URL}/account/export`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mew-data-export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await api("/account", { method: "DELETE" });
      clearToken();
      router.replace("/login");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
      setDeleting(false);
    }
  }

  const isOwner = me?.role === "owner";
  const canDelete = confirmText.trim() === (me?.organization.name ?? "");

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Account</h1>
      <p className="mt-1 text-slate-500">Export your data or delete your workspace.</p>

      <section className="mt-6 card p-6">
        <h2 className="font-semibold text-slate-900">Export your data</h2>
        <p className="mt-1 text-sm text-slate-500">
          Download everything in your workspace (leads, appointments, calls,
          reviews, documents, and more) as a JSON file. Connected credentials are
          not included.
        </p>
        <button onClick={exportData} className="btn-secondary mt-4">
          Download data export
        </button>
      </section>

      <section className="mt-6 rounded-2xl border border-red-200 bg-red-50/50 p-6">
        <h2 className="font-semibold text-red-700">Danger zone</h2>
        <p className="mt-1 text-sm text-red-600/90">
          Permanently delete <strong>{me?.organization.name}</strong> and all of
          its data. This cannot be undone.
        </p>
        {isOwner ? (
          <div className="mt-4 max-w-sm">
            <label className="label text-red-700">
              Type the workspace name to confirm
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={me?.organization.name}
              className="input border-red-300 focus:border-red-500 focus:ring-red-100"
            />
            <button
              onClick={deleteAccount}
              disabled={!canDelete || deleting}
              className="btn-danger mt-3 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Delete workspace permanently"}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Only the workspace owner can delete the account.</p>
        )}
      </section>
    </div>
  );
}
