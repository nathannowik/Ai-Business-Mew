import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
  type IntegrationStatus,
} from "@mew/shared";
import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { decryptSecret, encryptSecret } from "../crypto.js";

function providerSpec(provider: string): IntegrationProvider {
  const spec = INTEGRATION_PROVIDERS.find((p) => p.key === provider);
  if (!spec) throw new Error(`Unknown integration provider: ${provider}`);
  return spec;
}

function secretKeys(spec: IntegrationProvider): Set<string> {
  return new Set(spec.fields.filter((f) => f.type === "password").map((f) => f.key));
}

/**
 * Full, decrypted config for internal use (sending SMS/email, telephony).
 * Never expose this over the API.
 */
export async function getIntegrationConfig(
  organizationId: string,
  provider: string,
): Promise<Record<string, string> | null> {
  const row = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  if (!row || !row.connected) return null;

  const spec = providerSpec(provider);
  const secrets = secretKeys(spec);
  const stored = row.config as Record<string, string>;
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(stored)) {
    out[k] = secrets.has(k) && v ? decryptSecret(v) : v;
  }
  return out;
}

/** Safe, masked view for the dashboard. */
export async function getIntegrationStatus(
  organizationId: string,
  provider: string,
): Promise<IntegrationStatus> {
  const spec = providerSpec(provider);
  const secrets = secretKeys(spec);
  const row = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  const stored = (row?.config as Record<string, string>) ?? {};
  const publicConfig: Record<string, string> = {};
  for (const field of spec.fields) {
    if (!secrets.has(field.key) && stored[field.key]) {
      publicConfig[field.key] = stored[field.key];
    }
  }
  return {
    provider,
    connected: row?.connected ?? false,
    publicConfig,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export async function listIntegrationStatuses(
  organizationId: string,
): Promise<IntegrationStatus[]> {
  return Promise.all(
    INTEGRATION_PROVIDERS.map((p) => getIntegrationStatus(organizationId, p.key)),
  );
}

/**
 * Upsert an integration. Secret fields are encrypted; a blank secret keeps the
 * previously-stored value so users needn't re-enter passwords to edit others.
 */
export async function saveIntegration(
  organizationId: string,
  provider: string,
  incoming: Record<string, string>,
): Promise<IntegrationStatus> {
  const spec = providerSpec(provider);
  const secrets = secretKeys(spec);

  const existingRow = await prisma.integration.findUnique({
    where: { organizationId_provider: { organizationId, provider } },
  });
  const existing = (existingRow?.config as Record<string, string>) ?? {};

  const merged: Record<string, string> = {};
  for (const field of spec.fields) {
    const value = incoming[field.key]?.trim() ?? "";
    if (secrets.has(field.key)) {
      // Keep the old encrypted secret if none was provided this time.
      merged[field.key] = value ? encryptSecret(value) : existing[field.key] ?? "";
    } else {
      merged[field.key] = value || existing[field.key] || "";
    }
  }

  const connected = spec.fields
    .filter((f) => !f.optional)
    .every((f) => Boolean(merged[f.key]));

  await prisma.integration.upsert({
    where: { organizationId_provider: { organizationId, provider } },
    create: {
      organizationId,
      provider,
      config: merged as Prisma.InputJsonValue,
      connected,
    },
    update: { config: merged as Prisma.InputJsonValue, connected },
  });

  return getIntegrationStatus(organizationId, provider);
}

export async function deleteIntegration(
  organizationId: string,
  provider: string,
): Promise<void> {
  await prisma.integration.deleteMany({ where: { organizationId, provider } });
}
