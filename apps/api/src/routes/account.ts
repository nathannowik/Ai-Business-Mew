import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "../middleware/authenticate.js";

async function requireOwner(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (request.auth!.role !== "owner") {
    await reply.code(403).send({ error: "Only the owner can do this." });
  }
}

export async function accountRoutes(app: FastifyInstance): Promise<void> {
  // Export all of the organization's data (secrets and password hashes excluded).
  app.get("/account/export", { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.auth!.organizationId;
    const [
      organization,
      users,
      leads,
      appointments,
      calls,
      reviews,
      knowledgeDocs,
      contentPieces,
      documents,
      salesCalls,
      opportunities,
      chatSessions,
      serviceConfigs,
    ] = await Promise.all([
      prisma.organization.findUnique({ where: { id: organizationId } }),
      prisma.user.findMany({
        where: { organizationId },
        select: { id: true, email: true, name: true, role: true, createdAt: true },
      }),
      prisma.lead.findMany({ where: { organizationId } }),
      prisma.appointment.findMany({ where: { organizationId } }),
      prisma.call.findMany({ where: { organizationId } }),
      prisma.review.findMany({ where: { organizationId } }),
      prisma.knowledgeDoc.findMany({ where: { organizationId } }),
      prisma.contentPiece.findMany({ where: { organizationId } }),
      prisma.document.findMany({ where: { organizationId } }),
      prisma.salesCall.findMany({ where: { organizationId } }),
      prisma.opportunity.findMany({ where: { organizationId } }),
      prisma.chatSession.findMany({ where: { organizationId } }),
      // Service configs may hold prompts but not secrets; integrations (which
      // hold encrypted credentials) are intentionally excluded from the export.
      prisma.serviceConfig.findMany({ where: { organizationId } }),
    ]);

    const bundle = {
      exportedAt: new Date().toISOString(),
      organization,
      users,
      leads,
      appointments,
      calls,
      reviews,
      knowledgeDocs,
      contentPieces,
      documents,
      salesCalls,
      opportunities,
      chatSessions,
      serviceConfigs,
    };

    return reply
      .type("application/json")
      .header("Content-Disposition", 'attachment; filename="mew-data-export.json"')
      .send(JSON.stringify(bundle, null, 2));
  });

  // Permanently delete the organization and everything in it (owner only).
  app.delete("/account", { preHandler: requireOwner }, async (request, reply) => {
    await prisma.organization.delete({ where: { id: request.auth!.organizationId } });
    return reply.code(204).send();
  });
}
