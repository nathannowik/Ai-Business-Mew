import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      include: { organization: true },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      organization: {
        id: user.organization.id,
        name: user.organization.name,
        createdAt: user.organization.createdAt,
      },
    };
  });
}
