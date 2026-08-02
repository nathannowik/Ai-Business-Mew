import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/db.js";

export { prisma };

export async function makeApp(): Promise<FastifyInstance> {
  return buildApp({ logger: false });
}

/** Remove all data between tests. Everything cascades from Organization. */
export async function resetDb(): Promise<void> {
  await prisma.organization.deleteMany();
}

let counter = 0;

export interface TestAccount {
  token: string;
  organizationId: string;
  userId: string;
  email: string;
}

/** Sign up a fresh org + owner via the real auth route; returns creds. */
export async function signup(
  app: FastifyInstance,
  overrides: Partial<{ email: string; organizationName: string }> = {},
): Promise<TestAccount> {
  counter += 1;
  const email = overrides.email ?? `user${counter}@test.dev`;
  const res = await app.inject({
    method: "POST",
    url: "/auth/signup",
    payload: {
      email,
      password: "password123",
      name: "Test User",
      organizationName: overrides.organizationName ?? `Org ${counter}`,
    },
  });
  if (res.statusCode !== 201) {
    throw new Error(`signup failed: ${res.statusCode} ${res.body}`);
  }
  const body = res.json();
  return {
    token: body.token,
    organizationId: body.user.organizationId,
    userId: body.user.id,
    email,
  };
}

export function auth(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

/** Give an org an active subscription so entitlement checks pass. */
export async function setPlan(
  organizationId: string,
  planKey: string,
): Promise<void> {
  await prisma.subscription.upsert({
    where: { organizationId },
    create: { organizationId, planKey, status: "active", simulated: true },
    update: { planKey, status: "active", simulated: true },
  });
}

export async function makePlatformAdmin(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { isPlatformAdmin: true } });
}
