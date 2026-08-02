import type { FastifyInstance } from "fastify";
import { SERVICE_CATALOG } from "@mew/shared";
import { authenticate } from "../middleware/authenticate.js";
import { prisma } from "../db.js";
import { receptionistRoutes } from "./receptionist/routes.js";
import { registerTwilioWebhooks } from "./receptionist/twilio.js";
import { leadFollowUpRoutes } from "./lead_follow_up/routes.js";
import { customerServiceRoutes } from "./customer_service/routes.js";
import { businessReportingRoutes } from "./business_reporting/routes.js";
import { marketingAssistantRoutes } from "./marketing_assistant/routes.js";
import { documentAutomationRoutes } from "./document_automation/routes.js";
import { reviewManagementRoutes } from "./review_management/routes.js";
import { employeeKnowledgeBaseRoutes } from "./employee_knowledge_base/routes.js";
import { salesAssistantRoutes } from "./sales_assistant/routes.js";
import { schedulingRoutes } from "./scheduling/routes.js";
import { integrationRoutes } from "../integrations/routes.js";
import { isEntitled } from "../billing/service.js";

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
  await businessReportingRoutes(app);
  await marketingAssistantRoutes(app);
  await documentAutomationRoutes(app);
  await reviewManagementRoutes(app);
  await employeeKnowledgeBaseRoutes(app);
  await salesAssistantRoutes(app);
  await schedulingRoutes(app);

  // Catalog + per-org enablement state, used by the dashboard to render tiles.
  app.get("/services", { preHandler: authenticate }, async (request) => {
    const orgId = request.auth!.organizationId;
    const configs = await prisma.serviceConfig.findMany({
      where: { organizationId: orgId },
    });
    const enabledByKey = new Map(configs.map((c) => [c.serviceKey, c.enabled]));
    return Promise.all(
      SERVICE_CATALOG.map(async (s) => ({
        ...s,
        enabled: enabledByKey.get(s.key) ?? false,
        // Whether the org's current plan unlocks this service.
        entitled: await isEntitled(orgId, s.key),
      })),
    );
  });
}
