import type { FastifyInstance } from "fastify";
import { chat } from "../../ai/claude.js";
import { env } from "../../env.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { gatherMetrics } from "./service.js";

export async function businessReportingRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("business_reporting");

  // Raw metrics (works with no AI key — powers the dashboard tiles/charts).
  app.get<{ Querystring: { days?: string } }>(
    "/reporting/metrics",
    { preHandler: guard },
    async (request) => {
      const days = Math.min(Math.max(Number(request.query.days) || 30, 1), 365);
      return gatherMetrics(request.auth!.organizationId, days);
    },
  );

  // AI narrative summary of the metrics.
  app.post<{ Body: { days?: number } }>(
    "/reporting/summary",
    { preHandler: guard },
    async (request) => {
      const days = Math.min(Math.max(Number(request.body?.days) || 30, 1), 365);
      const metrics = await gatherMetrics(request.auth!.organizationId, days);

      const result = await chat({
        model: env.aiModel,
        maxTokens: 700,
        system:
          "You are a business analyst for a local service business. Given metrics, write a short, plain-English performance summary: 2-3 sentence overview, then 3-5 concise bullet insights, then 1-2 concrete recommendations. Be specific and reference the numbers. Do not invent data beyond what's given.",
        messages: [
          {
            role: "user",
            content: `Metrics for the last ${days} days:\n${JSON.stringify(metrics, null, 2)}`,
          },
        ],
      });

      return { metrics, summary: result.text };
    },
  );
}
