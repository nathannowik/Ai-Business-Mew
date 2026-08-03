import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { prisma } from "../db.js";
import { env } from "../env.js";
import { authenticate } from "../middleware/authenticate.js";
import { hashPassword } from "../auth/password.js";
import { emailLayout, sendSystemEmail } from "../email/service.js";

/** Only owners/admins may manage team members. */
async function requireManager(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  await authenticate(request, reply);
  if (reply.sent) return;
  if (!["owner", "admin"].includes(request.auth!.role)) {
    await reply.code(403).send({ error: "Owner or admin access required" });
  }
}

export async function teamRoutes(app: FastifyInstance): Promise<void> {
  app.get("/team", { preHandler: authenticate }, async (request) => {
    const users = await prisma.user.findMany({
      where: { organizationId: request.auth!.organizationId },
      orderBy: { createdAt: "asc" },
    });
    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));
  });

  const inviteSchema = z.object({
    email: z.string().email(),
    name: z.string().min(1),
    role: z.enum(["admin", "member"]),
    password: z.string().min(8),
  });

  // Invite = create a member in this org with a temporary password.
  app.post("/team", { preHandler: requireManager }, async (request, reply) => {
    const parsed = inviteSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
    if (existing) return reply.code(409).send({ error: "Email already in use" });

    const user = await prisma.user.create({
      data: {
        organizationId: request.auth!.organizationId,
        email: parsed.data.email,
        name: parsed.data.name,
        role: parsed.data.role,
        passwordHash: await hashPassword(parsed.data.password),
      },
    });
    // Email the new member their sign-in details (logged in simulation mode).
    await sendSystemEmail(
      user.email,
      "You've been invited to Mew AI",
      emailLayout(
        `You're on the team, ${user.name}`,
        `You've been added to a Mew AI workspace. Sign in with this email and the temporary password you were given, then change it from your account.`,
        { label: "Sign in", url: `${env.appBaseUrl}/login` },
      ),
    );

    return reply.code(201).send({ id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt });
  });

  app.delete<{ Params: { id: string } }>(
    "/team/:id",
    { preHandler: requireManager },
    async (request, reply) => {
      if (request.params.id === request.auth!.userId) {
        return reply.code(400).send({ error: "You can't remove yourself" });
      }
      const target = await prisma.user.findFirst({
        where: { id: request.params.id, organizationId: request.auth!.organizationId },
      });
      if (!target) return reply.code(404).send({ error: "Not found" });
      if (target.role === "owner") {
        return reply.code(400).send({ error: "Can't remove the owner" });
      }
      await prisma.user.delete({ where: { id: target.id } });
      return reply.code(204).send();
    },
  );
}
