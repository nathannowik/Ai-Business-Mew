import type { FastifyBaseLogger } from "fastify";
import { runAllDrips } from "./modules/lead_follow_up/drip.js";
import { runAllReviewSyncs } from "./modules/review_management/monitor.js";

const INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

/**
 * Start the background scheduler: automated lead re-engagement (drip) and
 * review polling across all orgs. Returns a stop() to clear the timer.
 */
export function startScheduler(log: FastifyBaseLogger): () => void {
  async function tick(): Promise<void> {
    try {
      const drips = await runAllDrips();
      const reviews = await runAllReviewSyncs();
      if (drips || reviews) {
        log.info(`scheduler: sent ${drips} drip(s), imported ${reviews} review(s)`);
      }
    } catch (err) {
      log.error({ err }, "scheduler tick failed");
    }
  }

  const timer = setInterval(tick, INTERVAL_MS);
  // Don't keep the process alive solely for the timer.
  timer.unref?.();
  log.info(`scheduler started (every ${INTERVAL_MS / 60000} min)`);
  return () => clearInterval(timer);
}
