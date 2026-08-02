import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

const upsertSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

export async function knowledgeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/knowledge", { preHandler: authenticate }, async (request) => {
    return prisma.knowledgeDoc.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { updatedAt: "desc" },
    });
  });

  app.post("/knowledge", { preHandler: authenticate }, async (request, reply) => {
    const parsed = upsertSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    return reply.code(201).send(
      await prisma.knowledgeDoc.create({
        data: {
          organizationId: request.auth!.organizationId,
          title: parsed.data.title,
          content: parsed.data.content,
        },
      }),
    );
  });

  app.put<{ Params: { id: string } }>(
    "/knowledge/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = upsertSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const result = await prisma.knowledgeDoc.updateMany({
        where: {
          id: request.params.id,
          organizationId: request.auth!.organizationId,
        },
        data: parsed.data,
      });
      if (result.count === 0) return reply.code(404).send({ error: "Not found" });
      return prisma.knowledgeDoc.findUnique({ where: { id: request.params.id } });
    },
  );

  app.delete<{ Params: { id: string } }>(
    "/knowledge/:id",
    { preHandler: authenticate },
    async (request, reply) => {
      const result = await prisma.knowledgeDoc.deleteMany({
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
