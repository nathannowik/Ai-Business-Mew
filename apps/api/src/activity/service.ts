import type { ActivityType } from "@mew/shared";
import { prisma } from "../db.js";

/**
 * Record a cross-service activity event. Best-effort: logging must never break
 * the action that triggered it, so failures are swallowed.
 */
export async function logActivity(
  organizationId: string,
  type: ActivityType,
  title: string,
  detail?: string | null,
): Promise<void> {
  try {
    await prisma.activityEvent.create({
      data: { organizationId, type, title, detail: detail ?? null },
    });
  } catch (err) {
    console.error("[activity] failed to log:", (err as Error).message);
  }
}

export function listActivity(organizationId: string, limit = 50) {
  return prisma.activityEvent.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function unreadCount(organizationId: string): Promise<number> {
  return prisma.activityEvent.count({ where: { organizationId, read: false } });
}

export async function markAllRead(organizationId: string): Promise<void> {
  await prisma.activityEvent.updateMany({
    where: { organizationId, read: false },
    data: { read: true },
  });
}
