import type { FastifyInstance } from "fastify";
import type { OnboardingStatus, OnboardingStep } from "@mew/shared";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

/** Guided first-run checklist — computed from the org's real state. */
export async function onboardingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/onboarding-status", { preHandler: authenticate }, async (request): Promise<OnboardingStatus> => {
    const organizationId = request.auth!.organizationId;

    const [subscription, knowledgeCount, integrationCount, serviceConfigCount, teamCount] =
      await Promise.all([
        prisma.subscription.findUnique({ where: { organizationId } }),
        prisma.knowledgeDoc.count({ where: { organizationId } }),
        prisma.integration.count({ where: { organizationId, connected: true } }),
        prisma.serviceConfig.count({ where: { organizationId } }),
        prisma.user.count({ where: { organizationId } }),
      ]);

    const hasPlan = Boolean(
      subscription && ["active", "trialing"].includes(subscription.status),
    );

    const steps: OnboardingStep[] = [
      {
        key: "plan",
        label: "Choose a plan",
        description: "Pick the plan that unlocks the services you want.",
        done: hasPlan,
        href: "/dashboard/billing",
      },
      {
        key: "configure",
        label: "Configure a service",
        description: "Set up your receptionist, lead follow-up, or chat.",
        done: serviceConfigCount > 0,
        href: "/dashboard/receptionist",
      },
      {
        key: "knowledge",
        label: "Add business info",
        description: "Add services, pricing, and policies so the AI can answer accurately.",
        done: knowledgeCount > 0,
        href: "/dashboard/knowledge",
      },
      {
        key: "integrations",
        label: "Connect a tool",
        description: "Connect Twilio or email to send calls, texts, and messages for real.",
        done: integrationCount > 0,
        href: "/dashboard/integrations",
      },
      {
        key: "team",
        label: "Invite your team",
        description: "Add colleagues who should have access.",
        done: teamCount > 1,
        href: "/dashboard/team",
      },
    ];

    const completed = steps.filter((s) => s.done).length;
    return { steps, completed, total: steps.length, complete: completed === steps.length };
  });
}
