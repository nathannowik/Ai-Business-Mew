import type { FastifyInstance } from "fastify";
import { SERVICE_CATALOG } from "@mew/shared";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db.js";
import { receptionistRoutes } from "./receptionist/routes.js";
import { registerTwilioWebhooks } from "./receptionist/twilio.js";
import { leadFollowUpRoutes } from "./lead_follow_up/routes.js";
import { customerServiceRoutes } from "./customer_service/routes.js";
import { integrationRoutes } from "../integrations/routes.js";

/**
 * Central place where AI service modules register their routes. Adding the next
 * service (lead follow-up, review management, ...) means writing its module and
 * adding one line here — the platform (auth, DB, AI, dashboard) is shared.
 */
export async function registerModules(app: FastifyInstance): Promise<void> {
  await integrationRoutes(app);
  await receptionistRoutes(app);
  await registerTwilioWebhooks(app);
  await leadFollowUpRoutes(app);
  await customerServiceRoutes(app);
  // await reviewManagementRoutes(app);   // next up

  // Catalog + per-org enablement state, used by the dashboard to render tiles.
  app.get("/services", { preHandler: authenticate }, async (request) => {
    const configs = await prisma.serviceConfig.findMany({
      where: { organizationId: request.auth!.organizationId },
    });
    const enabledByKey = new Map(configs.map((c) => [c.serviceKey, c.enabled]));
    return SERVICE_CATALOG.map((s) => ({
      ...s,
      enabled: enabledByKey.get(s.key) ?? false,
    }));
  });
}
