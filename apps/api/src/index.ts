import Fastify from "fastify";
import cors from "@fastify/cors";
import formbody from "@fastify/formbody";
import { env } from "./env.js";
import { authRoutes } from "./auth/routes.js";
import { meRoutes } from "./routes/me.js";
import { adminRoutes } from "./routes/admin.js";
import { appointmentRoutes } from "./routes/appointments.js";
import { knowledgeRoutes } from "./routes/knowledge.js";
import { registerModules } from "./modules/registry.js";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  // Twilio posts application/x-www-form-urlencoded webhooks.
  await app.register(formbody);

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
  await app.register(registerModules);

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    app.log.info(`API listening on ${env.publicApiUrl}`);
    if (!env.aiEnabled) {
      app.log.warn("ANTHROPIC_API_KEY not set — AI features will error until configured.");
    }
    if (!env.twilio.enabled) {
      app.log.warn("Twilio not configured — receptionist runs in simulation mode only.");
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
