import { SERVICE_KEYS } from "./services.js";

export type SubscriptionStatus =
  | "none"
  | "trialing"
  | "active"
  | "past_due"
  | "canceled";

export interface BillingPlan {
  key: string;
  name: string;
  /** Monthly price in whole US dollars. */
  priceMonthly: number;
  description: string;
  features: string[];
  /** Service keys this plan unlocks. */
  includedServices: string[];
}

export const BILLING_PLANS: BillingPlan[] = [
  {
    key: "starter",
    name: "Starter",
    priceMonthly: 99,
    description: "Never miss a call.",
    features: ["AI Receptionist", "Appointment booking", "Call transcripts"],
    includedServices: ["receptionist", "scheduling"],
  },
  {
    key: "growth",
    name: "Growth",
    priceMonthly: 299,
    description: "Capture and convert every lead.",
    features: [
      "Everything in Starter",
      "AI Lead Follow-Up",
      "AI Customer Service chat",
      "Knowledge base",
    ],
    includedServices: [
      "receptionist",
      "scheduling",
      "lead_follow_up",
      "customer_service",
      "knowledge_base",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 599,
    description: "The full AI back office.",
    features: [
      "Everything in Growth",
      "All 10 AI services",
      "Priority support",
    ],
    includedServices: [...SERVICE_KEYS],
  },
];

export function getPlan(planKey: string | null | undefined): BillingPlan | null {
  if (!planKey) return null;
  return BILLING_PLANS.find((p) => p.key === planKey) ?? null;
}

/** Whether a plan (by key) unlocks a given service. */
export function planIncludesService(
  planKey: string | null | undefined,
  serviceKey: string,
): boolean {
  const plan = getPlan(planKey);
  return plan ? plan.includedServices.includes(serviceKey) : false;
}

/** Statuses that grant access to included services. */
export const ACTIVE_STATUSES: SubscriptionStatus[] = ["trialing", "active"];

export interface SubscriptionDTO {
  planKey: string | null;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  /** True when activated in simulation mode (no real Stripe subscription). */
  simulated: boolean;
}
