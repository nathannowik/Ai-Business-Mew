import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import multipart from "@fastify/multipart";
import { env } from "./env.js";
import { authRoutes } from "./auth/routes.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
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

  await app.register(cors, { origin: true });
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
  await app.register(appointmentRoutes);
  await app.register(knowledgeRoutes);
  await app.register(billingRoutes);
  await app.register(activityRoutes);
  await app.register(registerModules);

  return app;
}
