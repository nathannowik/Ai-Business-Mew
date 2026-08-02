import type { FastifyReply, FastifyRequest } from "fastify";
import { isEntitled } from "../billing/service.js";
import { authenticate } from "./authenticate.js";

/**
 * preHandler factory: requires the authenticated org to have an active plan
 * that includes `serviceKey`. Returns 402 Payment Required otherwise, so the
 * dashboard can prompt an upgrade.
 */
export function requireEntitlement(serviceKey: string) {
  return async function (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> {
    await authenticate(request, reply);
    if (reply.sent) return;
    if (!(await isEntitled(request.auth!.organizationId, serviceKey))) {
      await reply.code(402).send({
        error: "This service isn't included in your plan.",
        code: "upgrade_required",
        service: serviceKey,
      });
    }
  };
}
