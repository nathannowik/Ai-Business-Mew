import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../../db.js";
import { requireEntitlement } from "../../middleware/requireEntitlement.js";
import { sendSms } from "../../channels/send.js";
import { getReceptionistConfig } from "../receptionist/service.js";

/**
 * Appointment scheduling actions: reschedule/edit, and send confirmations and
 * reminders. Messages fall back to simulation when no channel is connected.
 * (Booking + listing live in routes/appointments.ts; the receptionist and lead
 * modules also create appointments.)
 */
export async function schedulingRoutes(app: FastifyInstance): Promise<void> {
  const guard = requireEntitlement("scheduling");

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
