import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { ReceptionistConfig } from "@mew/shared";
import { prisma } from "../../db.js";
import { authenticate } from "../../middleware/authenticate.js";
import { runReceptionistTurn } from "./agent.js";
import {
  getReceptionistConfig,
  saveReceptionistConfig,
  startCall,
  getCall,
} from "./service.js";

const configSchema = z.object({
  greeting: z.string().min(1),
  businessName: z.string().min(1),
  businessHours: z.string(),
  transferNumber: z.string().nullable(),
  instructions: z.string(),
  enabled: z.boolean(),
});

export async function receptionistRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/receptionist/config",
    { preHandler: authenticate },
    async (request) => {
      return getReceptionistConfig(request.auth!.organizationId);
    },
  );

  app.put(
    "/receptionist/config",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = configSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      return saveReceptionistConfig(
        request.auth!.organizationId,
        parsed.data as ReceptionistConfig,
      );
    },
  );

  app.get(
    "/receptionist/calls",
    { preHandler: authenticate },
    async (request) => {
      const calls = await prisma.call.findMany({
        where: { organizationId: request.auth!.organizationId },
        orderBy: { startedAt: "desc" },
        take: 100,
      });
      return calls;
    },
  );

  app.get<{ Params: { id: string } }>(
    "/receptionist/calls/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const call = await prisma.call.findFirst({
        where: {
          id: request.params.id,
          organizationId: request.auth!.organizationId,
        },
      });
      if (!call) return reply.code(404).send({ error: "Not found" });
      return call;
    },
  );

  // --- Simulation: test the receptionist from the dashboard, no phone needed.
  const simTurnSchema = z.object({
    callId: z.string().optional(),
    message: z.string().min(1),
  });

  app.post(
    "/receptionist/simulate",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = simTurnSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const organizationId = request.auth!.organizationId;

      let callId = parsed.data.callId;
      if (!callId) {
        const call = await startCall({
          organizationId,
          fromNumber: "+15550000000 (simulator)",
          toNumber: "simulator",
        });
        callId = call.id;
      } else {
        const existing = await getCall(callId);
        if (!existing || existing.organizationId !== organizationId) {
          return reply.code(404).send({ error: "Call not found" });
        }
      }

      const result = await runReceptionistTurn(callId, parsed.data.message);
      return { callId, ...result };
    },
  );
}
