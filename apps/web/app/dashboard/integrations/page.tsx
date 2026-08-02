"use client";

import { useEffect, useState } from "react";
import type { IntegrationProvider, IntegrationStatus } from "@mew/shared";
import { api } from "../../../lib/api";

export default function IntegrationsPage() {
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [statuses, setStatuses] = useState<Record<string, IntegrationStatus>>({});

  async function load() {
    const [provs, stats] = await Promise.all([
      api<IntegrationProvider[]>("/integrations/providers"),
      api<IntegrationStatus[]>("/integrations"),
    ]);
    setProviders(provs);
    setStatuses(Object.fromEntries(stats.map((s) => [s.provider, s])));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
      <p className="mt-1 text-slate-500">
        Connect your tools so the AI can act for you. Secrets are encrypted and
        never shown again. Until connected, features run in simulation mode.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {providers.map((provider) => (
          <ProviderCard
            key={provider.key}
            provider={provider}
            status={statuses[provider.key]}
            onSaved={load}
          />
        ))}
      </div>
    </div>
  );
}

function ProviderCard({
  provider,
  status,
  onSaved,
}: {
  provider: IntegrationProvider;
  status?: IntegrationStatus;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Seed non-secret fields from the saved public config.
  useEffect(() => {
    if (status) setValues((v) => ({ ...status.publicConfig, ...v }));
  }, [status]);

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      await api(`/integrations/${provider.key}`, {
        method: "PUT",
        body: JSON.stringify({ config: values }),
      });
      setMsg("Saved");
      // Clear secret inputs after save.
      setValues((v) => {
        const next = { ...v };
        provider.fields
          .filter((f) => f.type === "password")
          .forEach((f) => delete next[f.key]);
        return next;
      });
      onSaved();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white shadow-card p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">{provider.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{provider.description}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            status?.connected
              ? "bg-green-100 text-green-700"
              : "bg-slate-100 text-slate-500"
          }`}
        >
          {status?.connected ? "Connected" : "Not connected"}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        {provider.fields.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {field.label}
              {field.optional && (
                <span className="text-slate-400"> (optional)</span>
              )}
            </span>
            <input
              type={field.type === "password" ? "password" : "text"}
              value={values[field.key] ?? ""}
              placeholder={
                field.type === "password" && status?.connected
                  ? "•••••• (leave blank to keep)"
                  : field.placeholder
              }
              onChange={(e) =>
                setValues((v) => ({ ...v, [field.key]: e.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </label>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {msg && <span className="text-sm text-slate-500">{msg}</span>}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Used by: {provider.usedBy.join(", ")}
      </p>
    </section>
  );
}
