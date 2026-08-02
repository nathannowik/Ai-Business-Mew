import type { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me", { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
    });
    if (!user) return reply.code(404).send({ error: "User not found" });

    // Use the org from the token, so platform-admin impersonation shows the
    // organization being acted on rather than the admin's home org.
    const activeOrgId = request.auth!.organizationId;
    const organization = await prisma.organization.findUnique({
      where: { id: activeOrgId },
    });
    if (!organization) return reply.code(404).send({ error: "Organization not found" });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isPlatformAdmin: user.isPlatformAdmin,
      organizationId: activeOrgId,
      impersonating: activeOrgId !== user.organizationId,
      organization: {
        id: organization.id,
        name: organization.name,
        createdAt: organization.createdAt,
      },
    };
  });
}
