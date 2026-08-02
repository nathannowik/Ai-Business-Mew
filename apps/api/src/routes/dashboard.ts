import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

/** Lightweight home-screen rollup (no entitlement gating — always available). */
export async function dashboardRoutes(app: FastifyInstance): Promise<void> {
  app.get("/dashboard-summary", { preHandler: authenticate }, async (request) => {
    const organizationId = request.auth!.organizationId;
    const now = new Date();

    const [leads, appointments, calls, reviews, upcomingAppointments, recentActivity] =
      await Promise.all([
        prisma.lead.count({ where: { organizationId } }),
        prisma.appointment.count({ where: { organizationId } }),
        prisma.call.count({ where: { organizationId } }),
        prisma.review.count({ where: { organizationId } }),
        prisma.appointment.findMany({
          where: { organizationId, startsAt: { gte: now } },
          orderBy: { startsAt: "asc" },
          take: 5,
        }),
        prisma.activityEvent.findMany({
          where: { organizationId },
          orderBy: { createdAt: "desc" },
          take: 8,
        }),
      ]);

    return {
      metrics: { leads, appointments, calls, reviews },
      upcomingAppointments,
      recentActivity,
    };
  });
}
