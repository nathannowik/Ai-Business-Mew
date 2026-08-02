"use client";

import { useEffect, useState } from "react";
import type { TeamMember } from "@mew/shared";
import { api } from "../../../lib/api";

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setMembers(await api<TeamMember[]>("/team"));
  }
  useEffect(() => {
    load().catch(() => setMembers([]));
  }, []);

  async function remove(id: string) {
    if (!confirm("Remove this team member?")) return;
    try {
      await api(`/team/${id}`, { method: "DELETE" });
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Team</h1>
          <p className="mt-1 text-slate-500">Invite colleagues to your workspace.</p>
        </div>
        <button
          onClick={() => setShowInvite((v) => !v)}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
        >
          {showInvite ? "Close" : "+ Invite member"}
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {showInvite && (
        <Invite
          onDone={() => {
            setShowInvite(false);
            load();
          }}
          onError={setError}
        />
      )}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Email</th>
              <th className="px-6 py-3 font-medium">Role</th>
              <th className="px-6 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-6 py-3 font-medium text-slate-800">{m.name}</td>
                <td className="px-6 py-3 text-slate-500">{m.email}</td>
                <td className="px-6 py-3">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {m.role}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  {m.role !== "owner" && (
                    <button onClick={() => remove(m.id)} className="text-red-500 hover:underline">
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Invite({
  onDone,
  onError,
}: {
  onDone: () => void;
  onError: (e: string) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/team", {
        method: "POST",
        body: JSON.stringify({ name, email, role, password }),
      });
      onDone();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 grid grid-cols-1 gap-4 rounded-2xl border border-slate-200/80 bg-white shadow-card p-6 sm:grid-cols-2">
      <Field label="Name" value={name} onChange={setName} />
      <Field label="Email" type="email" value={email} onChange={setEmail} />
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "member")}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
      </label>
      <Field label="Temporary password" type="password" value={password} onChange={setPassword} />
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {busy ? "Inviting…" : "Send invite"}
        </button>
        <p className="mt-2 text-xs text-slate-400">
          They sign in with this email + temporary password and can change it later.
        </p>
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
