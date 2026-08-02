import type { FastifyReply, FastifyRequest } from "fastify";
import { verifyToken, type TokenPayload } from "../auth/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    auth?: TokenPayload;
  }
}

/**
 * Fastify preHandler that requires a valid Bearer token and attaches the
 * decoded payload to `request.auth`. Use on every tenant-scoped route.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    await reply.code(401).send({ error: "Missing or malformed Authorization header" });
    return;
  }
  try {
    request.auth = verifyToken(header.slice("Bearer ".length));
  } catch {
    await reply.code(401).send({ error: "Invalid or expired token" });
  }
}
