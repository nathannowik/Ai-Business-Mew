import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

const createSchema = z.object({
  customerName: z.string().min(1),
  customerPhone: z.string().nullable().optional(),
  startsAt: z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  notes: z.string().nullable().optional(),
});

export async function appointmentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/appointments", { preHandler: authenticate }, async (request) => {
    return prisma.appointment.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { startsAt: "asc" },
      take: 200,
    });
  });

  app.post(
    "/appointments",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const d = parsed.data;
      return reply.code(201).send(
        await prisma.appointment.create({
          data: {
            organizationId: request.auth!.organizationId,
            customerName: d.customerName,
            customerPhone: d.customerPhone ?? null,
            startsAt: new Date(d.startsAt),
            durationMinutes: d.durationMinutes ?? 30,
            notes: d.notes ?? null,
            source: "manual",
          },
        }),
      );
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/appointments/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const result = await prisma.appointment.deleteMany({
        where: {
          id: request.params.id,
          organizationId: request.auth!.organizationId,
        },
      });
      if (result.count === 0) return reply.code(404).send({ error: "Not found" });
      return reply.code(204).send();
    },
  );
}
