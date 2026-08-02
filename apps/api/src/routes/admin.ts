import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { OrgSummary } from "@mew/shared";
import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import { signToken } from "../auth/jwt.js";
import { requirePlatformAdmin } from "../middleware/requirePlatformAdmin.js";

async function summarize(organizationId: string): Promise<OrgSummary["stats"]> {
  const [users, leads, calls, appointments] = await Promise.all([
    prisma.user.count({ where: { organizationId } }),
    prisma.lead.count({ where: { organizationId } }),
    prisma.call.count({ where: { organizationId } }),
    prisma.appointment.count({ where: { organizationId } }),
  ]);
  return { users, leads, calls, appointments };
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // List all client organizations with rollup stats.
  app.get(
    "/admin/organizations",
    { preHandler: requirePlatformAdmin },
    async () => {
      const orgs = await prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
      });
      return Promise.all(
        orgs.map(async (o): Promise<OrgSummary> => ({
          id: o.id,
          name: o.name,
          createdAt: o.createdAt.toISOString(),
          stats: await summarize(o.id),
        })),
      );
    },
  );

  // Create a new client organization + its first owner user.
  const createSchema = z.object({
    organizationName: z.string().min(1),
    ownerName: z.string().min(1),
    ownerEmail: z.string().email(),
    password: z.string().min(8),
  });

  app.post(
    "/admin/organizations",
    { preHandler: requirePlatformAdmin },
    async (request, reply) => {
      const parsed = createSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: parsed.error.flatten() });
      }
      const { organizationName, ownerName, ownerEmail, password } = parsed.data;

      const existing = await prisma.user.findUnique({ where: { email: ownerEmail } });
      if (existing) {
        return reply.code(409).send({ error: "Email already registered" });
      }

      const passwordHash = await hashPassword(password);
      const org = await prisma.organization.create({
        data: {
          name: organizationName,
          users: {
            create: { email: ownerEmail, name: ownerName, passwordHash, role: "owner" },
          },
        },
      });
      return reply.code(201).send({
        id: org.id,
        name: org.name,
        createdAt: org.createdAt.toISOString(),
        stats: { users: 1, leads: 0, calls: 0, appointments: 0 },
      });
    },
  );

  // Issue a token scoped to a client org so the admin can operate its dashboard.
  app.post<{ Params: { id: string } }>(
    "/admin/organizations/:id/impersonate",
    { preHandler: requirePlatformAdmin },
    async (request, reply) => {
      const org = await prisma.organization.findUnique({
        where: { id: request.params.id },
      });
      if (!org) return reply.code(404).send({ error: "Unknown organization" });

      const token = signToken({
        userId: request.auth!.userId,
        organizationId: org.id,
        role: "admin",
        isPlatformAdmin: true,
      });
      return { token, organization: { id: org.id, name: org.name } };
    },
  );
}
