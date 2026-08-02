import { env } from "./env.js";
import { buildApp } from "./app.js";
import { startScheduler } from "./scheduler.js";

async function main(): Promise<void> {
  const app = await buildApp({ logger: true });

  try {
    await app.listen({ port: env.port, host: "0.0.0.0" });
    app.log.info(`API listening on ${env.publicApiUrl}`);
    if (env.schedulerEnabled) startScheduler(app.log);
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
