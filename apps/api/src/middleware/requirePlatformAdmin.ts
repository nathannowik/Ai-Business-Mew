import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../db.js";
import { authenticate } from "./authenticate.js";

/**
 * preHandler that requires a valid token AND that the user is a platform admin.
 * Checks the DB (not just the token) so revoking admin takes effect immediately.
 */
export async function requirePlatformAdmin(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  await authenticate(request, reply);
  if (reply.sent) return;

  const user = await prisma.user.findUnique({
    where: { id: request.auth!.userId },
    select: { isPlatformAdmin: true },
  });
  if (!user?.isPlatformAdmin) {
    await reply.code(403).send({ error: "Platform admin access required" });
  }
}
