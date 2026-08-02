import Stripe from "stripe";
import { env } from "../env.js";

let client: Stripe | null = null;

/** Lazily-constructed Stripe client. Throws if Stripe isn't configured. */
export function getStripe(): Stripe {
  if (!env.stripe.enabled) {
    throw new Error("Stripe is not configured (STRIPE_SECRET_KEY missing).");
  }
  if (!client) {
    client = new Stripe(env.stripe.secretKey);
  }
  return client;
}

export { Stripe };
