import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { INTEGRATION_PROVIDERS } from "@mew/shared";
import { authenticate } from "../middleware/authenticate.js";
import {
  deleteIntegration,
  listIntegrationStatuses,
  saveIntegration,
} from "./service.js";

export async function integrationRoutes(app: FastifyInstance): Promise<void> {
  // Provider catalog (field specs) so the dashboard can render forms.
  app.get("/integrations/providers", { preHandler: authenticate }, async () => {
    return INTEGRATION_PROVIDERS;
  });

  // Current connection status for this org (secrets masked).
  app.get("/integrations", { preHandler: authenticate }, async (request) => {
    return listIntegrationStatuses(request.auth!.organizationId);
  });

  const saveSchema = z.object({ config: z.record(z.string()) });

  app.put<{ Params: { provider: string } }>(
    "/integrations/:provider",
    { preHandler: authenticate },
    async (request, reply) => {
      const provider = request.params.provider;
      if (!INTEGRATION_PROVIDERS.some((p) => p.key === provider)) {
        return reply.code(404).send({ error: "Unknown provider" });
      }
      const parsed = saveSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      return saveIntegration(
        request.auth!.organizationId,
        provider,
        parsed.data.config,
      );
    },
  );

  app.delete<{ Params: { provider: string } }>(
    "/integrations/:provider",
    { preHandler: authenticate },
    async (request, reply) => {
      await deleteIntegration(request.auth!.organizationId, request.params.provider);
      return reply.code(204).send();
    },
  );
}
