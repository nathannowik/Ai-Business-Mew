import twilio from "twilio";
import type { FastifyRequest } from "fastify";
import { env } from "../env.js";
import { getIntegrationConfig } from "../integrations/service.js";

/**
 * Verify that a webhook actually came from Twilio (X-Twilio-Signature).
 *
 * Uses the org's stored Twilio auth token (falling back to env). If no token is
 * configured, the org isn't taking real Twilio traffic, so we allow the request
 * (this keeps the local simulator working). Set TWILIO_SKIP_VALIDATION=1 to
 * bypass entirely in trusted environments.
 */
export async function verifyTwilioSignature(
  request: FastifyRequest,
  organizationId: string,
): Promise<boolean> {
  if (process.env.TWILIO_SKIP_VALIDATION === "1") return true;

  let authToken = env.twilio.authToken;
  const cfg = await getIntegrationConfig(organizationId, "twilio");
  if (cfg?.authToken) authToken = cfg.authToken;
  if (!authToken) return true; // not configured → no real Twilio calls to spoof

  const signature = request.headers["x-twilio-signature"];
  if (typeof signature !== "string") return false;

  const url = env.publicApiUrl + (request.raw.url ?? "");
  const params = (request.body ?? {}) as Record<string, string>;
  return twilio.validateRequest(authToken, signature, url, params);
}
