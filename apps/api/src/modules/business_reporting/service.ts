import type { ReportMetrics } from "@mew/shared";
import { prisma } from "../../db.js";

/** Roll up the org's activity over the last `rangeDays` into report metrics. */
export async function gatherMetrics(
  organizationId: string,
  rangeDays: number,
): Promise<ReportMetrics> {
  const since = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const now = new Date();

  const [
    callsTotal,
    callsCompleted,
    callsTransferred,
    callsMissed,
    leadsTotal,
    leadsQualified,
    leadsBooked,
    leadsLost,
    apptsTotal,
    apptsUpcoming,
    chatsTotal,
  ] = await Promise.all([
    prisma.call.count({ where: { organizationId, startedAt: { gte: since } } }),
    prisma.call.count({ where: { organizationId, startedAt: { gte: since }, status: "completed" } }),
    prisma.call.count({ where: { organizationId, startedAt: { gte: since }, status: "transferred" } }),
    prisma.call.count({ where: { organizationId, startedAt: { gte: since }, status: "missed" } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: since } } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: since }, status: "qualified" } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: since }, status: "booked" } }),
    prisma.lead.count({ where: { organizationId, createdAt: { gte: since }, status: "lost" } }),
    prisma.appointment.count({ where: { organizationId, createdAt: { gte: since } } }),
    prisma.appointment.count({ where: { organizationId, startsAt: { gte: now } } }),
    prisma.chatSession.count({ where: { organizationId, createdAt: { gte: since } } }),
  ]);

  return {
    rangeDays,
    calls: { total: callsTotal, completed: callsCompleted, transferred: callsTransferred, missed: callsMissed },
    leads: { total: leadsTotal, qualified: leadsQualified, booked: leadsBooked, lost: leadsLost },
    appointments: { total: apptsTotal, upcoming: apptsUpcoming },
    chats: { total: chatsTotal },
    conversionRate: leadsTotal ? Math.round((leadsBooked / leadsTotal) * 100) : 0,
  };
}
