import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { env } from "./env.js";
import { authRoutes } from "./auth/routes.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
import { dashboardRoutes } from "./routes/dashboard.js";
import { onboardingRoutes } from "./routes/onboarding.js";
import { teamRoutes } from "./routes/team.js";
import { exportRoutes } from "./routes/exports.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { billingRoutes } from "./billing/routes.js";
import { activityRoutes } from "./activity/routes.js";
import { registerModules } from "./modules/registry.js";

/**
 * Build the fully-configured Fastify app WITHOUT listening. Used by the server
 * entrypoint (index.ts) and by tests (via app.inject()).
 */
export async function buildApp(
  opts: { logger?: boolean } = {},
): Promise<FastifyInstance> {
  const app = Fastify({ logger: opts.logger ?? false });

  // Security headers. CSP is disabled because this API also serves the embed
  // widget.js for injection into arbitrary customer sites.
  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true });
  // Per-IP rate limit (public + auth abuse protection). Webhooks/health exempt.
  await app.register(rateLimit, {
    max: 300,
    timeWindow: "1 minute",
    allowList: (req) => req.url === "/health" || req.url.startsWith("/webhooks/"),
  });
  // Twilio posts application/x-www-form-urlencoded webhooks.
  await app.register(formbody);
  // Call-recording uploads for the Sales Assistant (limit 25MB).
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  app.get("/health", async () => ({
    status: "ok",
    ai: env.aiEnabled,
    telephony: env.twilio.enabled,
  }));

  await app.register(authRoutes);
  await app.register(meRoutes);
  await app.register(adminRoutes);
  await app.register(dashboardRoutes);
  await app.register(onboardingRoutes);
  await app.register(teamRoutes);
  await app.register(exportRoutes);
  await app.register(appointmentRoutes);
  await app.register(knowledgeRoutes);
  await app.register(billingRoutes);
  await app.register(activityRoutes);
  await app.register(registerModules);

  return app;
}
