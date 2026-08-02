"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrgSummary } from "@mew/shared";
import { api, getToken, setToken } from "../../../lib/api";

export default function AgencyPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<OrgSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    try {
      setOrgs(await api<OrgSummary[]>("/admin/organizations"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function openClient(id: string) {
    const res = await api<{ token: string }>(
      `/admin/organizations/${id}/impersonate`,
      { method: "POST" },
    );
    // Stash the admin token so we can return, then switch to the client token.
    const admin = getToken();
    if (admin) window.localStorage.setItem("mew_admin_token", admin);
    setToken(res.token);
    router.push("/dashboard");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Agency console</h1>
          <p className="mt-1 text-slate-500">
            Manage all your client businesses from one place.
          </p>
        </div>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showCreate ? "Close" : "+ New client"}
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {showCreate && (
        <CreateClient
          onCreated={() => {
            setShowCreate(false);
            load();
          }}
        />
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {orgs.map((o) => (
          <div
            key={o.id}
            className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-5"
          >
            <h2 className="font-semibold text-slate-900">{o.name}</h2>
            <p className="text-xs text-slate-400">
              Since {new Date(o.createdAt).toLocaleDateString()}
            </p>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <Stat label="Users" value={o.stats.users} />
              <Stat label="Leads" value={o.stats.leads} />
              <Stat label="Calls" value={o.stats.calls} />
              <Stat label="Appts" value={o.stats.appointments} />
            </dl>
            <button
              onClick={() => openClient(o.id)}
              className="mt-4 w-full rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Open dashboard
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <dt className="text-xs text-slate-400">{label}</dt>
      <dd className="text-lg font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function CreateClient({ onCreated }: { onCreated: () => void }) {
  const [organizationName, setOrganizationName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api("/admin/organizations", {
        method: "POST",
        body: JSON.stringify({ organizationName, ownerName, ownerEmail, password }),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white shadow-card p-6 sm:grid-cols-2"
    >
      <Field label="Business name" value={organizationName} onChange={setOrganizationName} />
      <Field label="Owner name" value={ownerName} onChange={setOwnerName} />
      <Field label="Owner email" type="email" value={ownerEmail} onChange={setOwnerEmail} />
      <Field label="Temporary password" type="password" value={password} onChange={setPassword} />
      <div className="sm:col-span-2">
        {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create client"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}
