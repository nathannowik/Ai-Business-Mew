import { Prisma } from "@prisma/client";
import type { BookingSlot, SchedulingConfig } from "@mew/shared";
import { prisma } from "../../db.js";

const DEFAULT_CONFIG: SchedulingConfig = {
  slotMinutes: 30,
  timezone: "local",
  // Mon–Fri 9–17, weekends closed. Index 0 = Sunday.
  weekly: [
    null,
    { start: "09:00", end: "17:00" },
    { start: "09:00", end: "17:00" },
    { start: "09:00", end: "17:00" },
    { start: "09:00", end: "17:00" },
    { start: "09:00", end: "17:00" },
    null,
  ],
  enabled: true,
};

export async function getSchedulingConfig(
  organizationId: string,
): Promise<SchedulingConfig> {
  const row = await prisma.serviceConfig.findUnique({
    where: { organizationId_serviceKey: { organizationId, serviceKey: "scheduling" } },
  });
  if (!row) return { ...DEFAULT_CONFIG };
  return { ...DEFAULT_CONFIG, ...(row.config as Partial<SchedulingConfig>) };
}

export async function saveSchedulingConfig(
  organizationId: string,
  config: SchedulingConfig,
): Promise<SchedulingConfig> {
  await prisma.serviceConfig.upsert({
    where: { organizationId_serviceKey: { organizationId, serviceKey: "scheduling" } },
    create: {
      organizationId,
      serviceKey: "scheduling",
      enabled: config.enabled,
      config: config as unknown as Prisma.InputJsonValue,
    },
    update: { enabled: config.enabled, config: config as unknown as Prisma.InputJsonValue },
  });
  return config;
}

/** True if no existing appointment overlaps [start, start+durationMinutes). */
export async function isSlotAvailable(
  organizationId: string,
  start: Date,
  durationMinutes: number,
): Promise<boolean> {
  const end = new Date(start.getTime() + durationMinutes * 60000);
  // Overlap check within a bounded window (appointments are short).
  const dayStart = new Date(start.getTime() - 12 * 60 * 60 * 1000);
  const dayEnd = new Date(start.getTime() + 12 * 60 * 60 * 1000);
  const nearby = await prisma.appointment.findMany({
    where: { organizationId, startsAt: { gte: dayStart, lte: dayEnd } },
  });
  return !nearby.some((a) => {
    const aStart = a.startsAt.getTime();
    const aEnd = aStart + a.durationMinutes * 60000;
    return aStart < end.getTime() && aEnd > start.getTime();
  });
}

function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Compute open booking slots over the next `days` days. */
export async function computeSlots(
  organizationId: string,
  days: number,
  now: Date = new Date(),
): Promise<BookingSlot[]> {
  const config = await getSchedulingConfig(organizationId);
  if (!config.enabled) return [];

  const rangeEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const appts = await prisma.appointment.findMany({
    where: { organizationId, startsAt: { gte: now, lte: rangeEnd } },
  });
  const taken = appts.map((a) => ({
    start: a.startsAt.getTime(),
    end: a.startsAt.getTime() + a.durationMinutes * 60000,
  }));

  const slots: BookingSlot[] = [];
  const slotMs = config.slotMinutes * 60000;

  for (let d = 0; d < days && slots.length < 60; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    const window = config.weekly[day.getDay()];
    if (!window) continue;

    const { h: sh, m: sm } = parseHM(window.start);
    const { h: eh, m: em } = parseHM(window.end);
    const dayStart = new Date(day);
    dayStart.setHours(sh, sm, 0, 0);
    const dayEnd = new Date(day);
    dayEnd.setHours(eh, em, 0, 0);

    for (let t = dayStart.getTime(); t + slotMs <= dayEnd.getTime(); t += slotMs) {
      if (t <= now.getTime()) continue; // no past slots
      const overlaps = taken.some((x) => x.start < t + slotMs && x.end > t);
      if (overlaps) continue;
      const dt = new Date(t);
      slots.push({
        startISO: dt.toISOString(),
        label: dt.toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      });
      if (slots.length >= 60) break;
    }
  }
  return slots;
}
