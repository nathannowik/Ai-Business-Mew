import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { BILLING_PLANS, getPlan } from "@mew/shared";
import { env } from "../env.js";
import { authenticate } from "../middleware/authenticate.js";
import {
  applyStripeSubscription,
  cancel,
  createPortal,
  getSubscription,
  startCheckout,
} from "./service.js";
import { getStripe, type Stripe } from "./stripe.js";

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/billing/plans", { preHandler: authenticate }, async () => BILLING_PLANS);

  app.get("/billing/subscription", { preHandler: authenticate }, async (request) => {
    const sub = await getSubscription(request.auth!.organizationId);
    return { ...sub, stripeEnabled: env.stripe.enabled };
  });

  const checkoutSchema = z.object({ planKey: z.string() });

  app.post("/billing/checkout", { preHandler: authenticate }, async (request, reply) => {
    const parsed = checkoutSchema.safeParse(request.body);
    if (!parsed.success || !getPlan(parsed.data.planKey)) {
      return reply.code(400).send({ error: "Unknown plan" });
    }
    return startCheckout(request.auth!.organizationId, parsed.data.planKey);
  });

  app.post("/billing/portal", { preHandler: authenticate }, async (request, reply) => {
    if (!env.stripe.enabled) {
      return reply.code(400).send({ error: "Billing portal requires Stripe to be configured." });
    }
    return { url: await createPortal(request.auth!.organizationId) };
  });

  app.post("/billing/cancel", { preHandler: authenticate }, async (request) => {
    return cancel(request.auth!.organizationId);
  });

  // Stripe webhook — needs the raw body for signature verification, so it runs
  // in an encapsulated scope with its own buffer content-type parser.
  await app.register(async (instance) => {
    instance.addContentTypeParser(
      "application/json",
      { parseAs: "buffer" },
      (_req, body, done) => done(null, body),
    );

    instance.post("/webhooks/stripe", async (request, reply) => {
      if (!env.stripe.enabled) return reply.code(400).send({ error: "Stripe not configured" });

      const signature = request.headers["stripe-signature"];
      let event: Stripe.Event;
      try {
        event = getStripe().webhooks.constructEvent(
          request.body as Buffer,
          signature as string,
          env.stripe.webhookSecret,
        );
      } catch (err) {
        return reply.code(400).send({ error: `Webhook signature failed: ${(err as Error).message}` });
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const sub = event.data.object as Stripe.Subscription;
        const organizationId = sub.metadata?.organizationId;
        if (organizationId) {
          await applyStripeSubscription({
            organizationId,
            planKey: sub.metadata?.planKey ?? null,
            status: event.type === "customer.subscription.deleted" ? "canceled" : sub.status,
            stripeSubscriptionId: sub.id,
            stripeCustomerId: String(sub.customer),
            currentPeriodEnd:
              (sub as unknown as { current_period_end?: number }).current_period_end ??
              null,
          });
        }
      }

      return reply.send({ received: true });
    });
  });
}
