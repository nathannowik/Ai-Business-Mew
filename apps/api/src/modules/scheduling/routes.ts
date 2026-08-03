import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { SchedulingConfig } from "@mew/shared";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { isEntitled } from "../../billing/service.js";
import { sendSms } from "../../channels/send.js";
import { logActivity } from "../../activity/service.js";
import { getReceptionistConfig } from "../receptionist/service.js";
import {
  computeSlots,
  getSchedulingConfig,
  isSlotAvailable,
  saveSchedulingConfig,
} from "./service.js";
import { googleCreateEvent } from "./googleCalendar.js";

/**
 * Appointment scheduling actions: reschedule/edit, and send confirmations and
 * reminders. Messages fall back to simulation when no channel is connected.
 * (Booking + listing live in routes/appointments.ts; the receptionist and lead
 * modules also create appointments.)
 */
export async function schedulingRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("scheduling");

  // --- Availability config (for the self-service booking page) ---
  app.get("/scheduling/config", { preHandler: guard }, async (request) => {
    return getSchedulingConfig(request.auth!.organizationId);
  });

  const configSchema = z.object({
    slotMinutes: z.number().int().positive().max(480),
    timezone: z.string(),
    weekly: z
      .array(z.object({ start: z.string(), end: z.string() }).nullable())
      .length(7),
    enabled: z.boolean(),
  });

  app.put("/scheduling/config", { preHandler: guard }, async (request, reply) => {
    const parsed = configSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    return saveSchedulingConfig(request.auth!.organizationId, parsed.data as SchedulingConfig);
  });

  // --- Public self-service booking (customer-facing; no auth) ---
  app.get<{ Params: { orgId: string }; Querystring: { days?: string } }>(
    "/public/booking/:orgId/slots",
    async (request, reply) => {
      const orgId = request.params.orgId;
      if (!(await isEntitled(orgId, "scheduling"))) {
        return reply.code(403).send({ error: "Booking is not available." });
      }
      const org = await prisma.organization.findUnique({ where: { id: orgId } });
      if (!org) return reply.code(404).send({ error: "Unknown business" });
      const days = Math.min(Math.max(Number(request.query.days) || 14, 1), 30);
      return { businessName: org.name, slots: await computeSlots(orgId, days) };
    },
  );

  const publicBookSchema = z.object({
    name: z.string().min(1),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    startsAt: z.string().datetime(),
    notes: z.string().optional(),
  });

  app.post<{ Params: { orgId: string } }>(
    "/public/booking/:orgId",
    async (request, reply) => {
      const orgId = request.params.orgId;
      if (!(await isEntitled(orgId, "scheduling"))) {
        return reply.code(403).send({ error: "Booking is not available." });
      }
      const parsed = publicBookSchema.safeParse(request.body);
      if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

      const config = await getSchedulingConfig(orgId);
      const startsAt = new Date(parsed.data.startsAt);
      if (!(await isSlotAvailable(orgId, startsAt, config.slotMinutes))) {
        return reply.code(409).send({ error: "That time was just taken. Please pick another." });
      }

      const appt = await prisma.appointment.create({
        data: {
          organizationId: orgId,
          customerName: parsed.data.name,
          customerPhone: parsed.data.phone ?? null,
          startsAt,
          durationMinutes: config.slotMinutes,
          notes: parsed.data.notes ?? null,
          source: "self_service",
        },
      });
      await logActivity(orgId, "appointment", `Self-booked: ${appt.customerName}`, startsAt.toLocaleString());
      await googleCreateEvent(orgId, {
        summary: `Appointment: ${appt.customerName}`,
        start: startsAt,
        durationMinutes: config.slotMinutes,
        description: appt.notes ?? undefined,
      });

      // Confirmation to the customer, if we can reach them.
      if (appt.customerPhone) {
        const cfg = await getReceptionistConfig(orgId);
        await sendSms(
          orgId,
          appt.customerPhone,
          `You're booked with ${cfg.businessName} for ${startsAt.toLocaleString()}. Reply to reschedule.`,
        );
      }
      return reply.code(201).send({ ok: true, appointmentId: appt.id });
    },
  );

  const rescheduleSchema = z.object({
    startsAt: z.string().datetime().optional(),
    durationMinutes: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
  });

  app.patch<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: guard },
    async (request, reply) => {
      const parsed = rescheduleSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const data: Record<string, unknown> = {};
      if (parsed.data.startsAt) data.startsAt = new Date(parsed.data.startsAt);
      if (parsed.data.durationMinutes) data.durationMinutes = parsed.data.durationMinutes;
      if (parsed.data.notes !== undefined) data.notes = parsed.data.notes;

      const r = await prisma.appointment.updateMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
        data,
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return prisma.appointment.findUnique({ where: { id: request.params.id } });
    },
  );

  async function notify(
    organizationId: string,
    appointmentId: string,
    kind: "confirmation" | "reminder",
  ) {
    const appt = await prisma.appointment.findFirst({
      where: { id: appointmentId, organizationId },
    });
    if (!appt) return { ok: false as const, status: 404 };

    const cfg = await getReceptionistConfig(organizationId);
    const when = appt.startsAt.toLocaleString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const message =
      kind === "confirmation"
        ? `Hi ${appt.customerName}, this confirms your appointment with ${cfg.businessName} on ${when}. Reply to reschedule.`
        : `Reminder from ${cfg.businessName}: your appointment is coming up on ${when}. See you then!`;

    let simulated = true;
    if (appt.customerPhone) simulated = (await sendSms(organizationId, appt.customerPhone, message)).simulated;
    return { ok: true as const, message, simulated };
  }

  app.post<{ Params: { id: string } }>(
    "/appointments/:id/confirm",
    { preHandler: guard },
    async (request, reply) => {
      const res = await notify(request.auth!.organizationId, request.params.id, "confirmation");
      if (!res.ok) return reply.code(404).send({ error: "Not found" });
      return { message: res.message, simulated: res.simulated };
    },
  );

  app.post<{ Params: { id: string } }>(
    "/appointments/:id/remind",
    { preHandler: guard },
    async (request, reply) => {
      const res = await notify(request.auth!.organizationId, request.params.id, "reminder");
      if (!res.ok) return reply.code(404).send({ error: "Not found" });
      return { message: res.message, simulated: res.simulated };
    },
  );

  // Cancel an appointment (scheduling-gated variant of delete).
  app.post<{ Params: { id: string } }>(
    "/appointments/:id/cancel",
    { preHandler: guard },
    async (request, reply) => {
      const r = await prisma.appointment.deleteMany({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (r.count === 0) return reply.code(404).send({ error: "Not found" });
      return { ok: true };
    },
  );
}
