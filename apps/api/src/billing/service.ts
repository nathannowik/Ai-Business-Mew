import {
  ACTIVE_STATUSES,
  getPlan,
  planIncludesService,
  type SubscriptionDTO,
  type SubscriptionStatus,
} from "@mew/shared";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { getStripe } from "./stripe.js";

const NONE: SubscriptionDTO = {
  planKey: null,
  status: "none",
  currentPeriodEnd: null,
  simulated: false,
};

function toDTO(sub: {
  planKey: string | null;
  status: string;
  currentPeriodEnd: Date | null;
  simulated: boolean;
}): SubscriptionDTO {
  return {
    planKey: sub.planKey,
    status: sub.status as SubscriptionStatus,
    currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
    simulated: sub.simulated,
  };
}

export async function getSubscription(
  organizationId: string,
): Promise<SubscriptionDTO> {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  return sub ? toDTO(sub) : NONE;
}

/** Is the org currently entitled to use a given service? */
export async function isEntitled(
  organizationId: string,
  serviceKey: string,
): Promise<boolean> {
  const sub = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!sub) return false;
  if (!ACTIVE_STATUSES.includes(sub.status as SubscriptionStatus)) return false;
  return planIncludesService(sub.planKey, serviceKey);
}

/** Simulation-mode activation: mark the plan active immediately (no charge). */
export async function activateSimulated(
  organizationId: string,
  planKey: string,
): Promise<SubscriptionDTO> {
  const periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const sub = await prisma.subscription.upsert({
    where: { organizationId },
    create: {
      organizationId,
      planKey,
      status: "active",
      simulated: true,
      currentPeriodEnd: periodEnd,
    },
    update: {
      planKey,
      status: "active",
      simulated: true,
      currentPeriodEnd: periodEnd,
    },
  });
  return toDTO(sub);
}

export async function cancel(organizationId: string): Promise<SubscriptionDTO> {
  const existing = await prisma.subscription.findUnique({ where: { organizationId } });
  if (!existing) return NONE;

  if (env.stripe.enabled && existing.stripeSubscriptionId && !existing.simulated) {
    await getStripe().subscriptions.cancel(existing.stripeSubscriptionId);
  }
  const sub = await prisma.subscription.update({
    where: { organizationId },
    data: { status: "canceled" },
  });
  return toDTO(sub);
}

/** Ensure a Stripe customer exists for the org, returning its id. */
async function ensureCustomer(organizationId: string): Promise<string> {
  const existing = await prisma.subscription.findUnique({ where: { organizationId } });
  if (existing?.stripeCustomerId) return existing.stripeCustomerId;

  const org = await prisma.organization.findUnique({ where: { id: organizationId } });
  const customer = await getStripe().customers.create({
    name: org?.name,
    metadata: { organizationId },
  });
  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, stripeCustomerId: customer.id },
    update: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export interface CheckoutResult {
  url: string;
  simulated: boolean;
}

/**
 * Start a subscription. With Stripe configured, returns a Checkout URL. Without
 * it, activates the plan in simulation mode and returns the success URL so the
 * flow is identical from the client's perspective.
 */
export async function startCheckout(
  organizationId: string,
  planKey: string,
): Promise<CheckoutResult> {
  const plan = getPlan(planKey);
  if (!plan) throw new Error(`Unknown plan: ${planKey}`);

  const successUrl = `${env.appBaseUrl}/dashboard/billing?status=success`;
  const cancelUrl = `${env.appBaseUrl}/dashboard/billing?status=cancel`;

  if (!env.stripe.enabled) {
    await activateSimulated(organizationId, planKey);
    return { url: successUrl, simulated: true };
  }

  const customerId = await ensureCustomer(organizationId);
  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: [
      {
        quantity: 1,
        // Ad-hoc price so no Stripe dashboard setup is required.
        price_data: {
          currency: "usd",
          recurring: { interval: "month" },
          unit_amount: plan.priceMonthly * 100,
          product_data: { name: `Mew AI — ${plan.name}` },
        },
      },
    ],
    metadata: { organizationId, planKey },
    subscription_data: { metadata: { organizationId, planKey } },
  });
  return { url: session.url ?? cancelUrl, simulated: false };
}

export async function createPortal(organizationId: string): Promise<string> {
  const customerId = await ensureCustomer(organizationId);
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: `${env.appBaseUrl}/dashboard/billing`,
  });
  return session.url;
}

/** Sync our subscription row from a Stripe subscription object. */
export async function applyStripeSubscription(params: {
  organizationId: string;
  planKey: string | null;
  status: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  currentPeriodEnd: number | null;
}): Promise<void> {
  await prisma.subscription.upsert({
    where: { organizationId: params.organizationId },
    create: {
      organizationId: params.organizationId,
      planKey: params.planKey,
      status: params.status,
      simulated: false,
      stripeSubscriptionId: params.stripeSubscriptionId,
      stripeCustomerId: params.stripeCustomerId,
      currentPeriodEnd: params.currentPeriodEnd
        ? new Date(params.currentPeriodEnd * 1000)
        : null,
    },
    update: {
      planKey: params.planKey ?? undefined,
      status: params.status,
      simulated: false,
      stripeSubscriptionId: params.stripeSubscriptionId,
      currentPeriodEnd: params.currentPeriodEnd
        ? new Date(params.currentPeriodEnd * 1000)
        : null,
    },
  });
}
